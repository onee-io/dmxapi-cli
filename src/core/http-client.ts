/**
 * @module core/http-client
 * @description HTTP 客户端
 *
 * 基于 Node.js 原生 fetch API（Node 20+），封装了：
 * - 自动添加 Authorization 头（Bearer Token）
 * - 请求超时控制（AbortController）
 * - 失败重试（指数退避 + 随机抖动）
 * - SSE（Server-Sent Events）流式响应解析
 *
 * 重试策略：
 * - 可重试的状态码：429（频率限制）、500、502、503（服务端错误）
 * - 不重试：400（客户端错误）、401（认证失败）、404（不存在）
 * - 退避公式：min(1000 * 2^(attempt-1), 10000) + random(0, 500) 毫秒
 */

import { ApiError, AuthenticationError, RateLimitError } from './errors.js';
import type { Logger } from './logger.js';

/** HTTP 客户端构造参数 */
export interface HttpClientOptions {
  baseUrl: string;
  apiKey: string;
  timeout: number;   // 默认超时（毫秒）
  retries: number;   // 最大重试次数
  logger: Logger;
}

/** 单次请求选项 */
export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;       // 覆盖默认超时
  signal?: AbortSignal;   // 外部取消信号
}

/** 可重试的 HTTP 状态码集合 */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);

export class HttpClient {
  constructor(private readonly opts: HttpClientOptions) {}

  /**
   * 发送同步 HTTP 请求（非流式）
   *
   * 自动处理重试、超时和错误分类。
   *
   * @typeParam T - 响应 JSON 的类型
   * @param path API 路径，如 "/v1/chat/completions"
   * @param options 请求选项
   * @returns 解析后的 JSON 响应
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'POST', body, headers = {}, signal } = options;
    const timeout = options.timeout ?? this.opts.timeout;

    const url = `${this.opts.baseUrl}${path}`;
    // FormData 自带 Content-Type（含 boundary），不能手动设置
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.opts.apiKey}`,
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    };

    let lastError: Error | undefined;

    // 重试循环：attempt 0 是首次请求，1~retries 是重试
    for (let attempt = 0; attempt <= this.opts.retries; attempt++) {
      if (attempt > 0) {
        // 指数退避 + 随机抖动，避免重试风暴
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10000) + Math.random() * 500;
        this.opts.logger.debug(`Retry attempt ${attempt} after ${Math.round(delay)}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }

      try {
        // 使用 AbortController 实现超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // 将外部取消信号传递给 AbortController
        if (signal) {
          signal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const responseBody = await response.text().catch(() => '');
          let parsed: unknown;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }

          // 401 直接抛出，不重试
          if (response.status === 401) throw new AuthenticationError();
          // 429 根据 Retry-After 头决定等待时间
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const error = new RateLimitError(
              retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined,
            );
            if (attempt < this.opts.retries) {
              lastError = error;
              continue;
            }
            throw error;
          }

          const apiError = new ApiError(
            `API request failed: ${response.status} ${response.statusText}`,
            response.status,
            parsed,
          );

          // 可重试状态码 → 继续重试；否则直接抛出
          if (RETRYABLE_STATUS.has(response.status) && attempt < this.opts.retries) {
            lastError = apiError;
            continue;
          }
          throw apiError;
        }

        return (await response.json()) as T;
      } catch (error) {
        // 认证错误和不可重试的 API 错误直接抛出
        if (
          error instanceof AuthenticationError ||
          (error instanceof ApiError && !RETRYABLE_STATUS.has(error.statusCode))
        ) {
          throw error;
        }
        // AbortError 说明请求超时
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new ApiError('Request timed out', 0);
        }
        lastError = error as Error;
        if (attempt >= this.opts.retries) break;
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  /**
   * 发送流式 HTTP 请求，解析 SSE（Server-Sent Events）响应
   *
   * SSE 格式：每行以 "data: " 开头，空行分隔事件，"data: [DONE]" 表示结束。
   * 此方法 yield 每个 data 行的内容（已去除 "data: " 前缀），调用方负责 JSON 解析。
   *
   * @param path API 路径
   * @param options 请求选项
   * @yields 每个 SSE data 行的原始字符串内容
   */
  async *stream(path: string, options: RequestOptions = {}): AsyncIterable<string> {
    const { method = 'POST', body, headers = {}, signal } = options;
    // 流式请求使用更长的超时（默认 120 秒）
    const timeout = options.timeout ?? 120000;

    const url = `${this.opts.baseUrl}${path}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.opts.apiKey}`,
      ...headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text().catch(() => '');
        if (response.status === 401) throw new AuthenticationError();
        throw new ApiError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          responseBody,
        );
      }

      if (!response.body) throw new ApiError('No response body for stream', 0);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // 逐块读取响应流，按行解析 SSE 事件
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 将二进制 chunk 解码并追加到缓冲区
        buffer += decoder.decode(value, { stream: true });
        // 按换行符分割，最后一个不完整的行保留在 buffer 中
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          // 跳过空行和 SSE 注释行（以 : 开头）
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            // [DONE] 是 OpenAI SSE 流的结束标记
            if (data === '[DONE]') return;
            yield data;
          }
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data !== '[DONE]') yield data;
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
