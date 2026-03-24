/**
 * @module core/errors
 * @description 自定义错误类层级体系
 *
 * 错误类层级：
 * - DmxapiError（基类）
 *   - ApiError（API 请求错误，含 HTTP 状态码）
 *     - AuthenticationError（401 认证失败）
 *     - RateLimitError（429 频率限制）
 *   - ConfigError（配置错误）
 *   - UnknownModelError（模型未找到匹配的处理器）
 *   - TaskFailedError（异步任务执行失败）
 *   - TaskTimeoutError（异步任务超时）
 *
 * 全局错误处理器根据错误类型输出友好提示和修复建议。
 */

import type { Capability } from '../types/index.js';

/** 所有 dmxapi-cli 错误的基类 */
export class DmxapiError extends Error {
  constructor(
    message: string,
    /** 错误码，用于程序化判断 */
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DmxapiError';
  }
}

/** API 请求错误（HTTP 非 2xx 响应） */
export class ApiError extends DmxapiError {
  constructor(
    message: string,
    /** HTTP 状态码 */
    public readonly statusCode: number,
    /** API 返回的原始响应体 */
    public readonly responseBody?: unknown,
  ) {
    super(message, `API_ERROR_${statusCode}`);
    this.name = 'ApiError';
  }
}

/** 认证错误（API Key 无效或缺失，HTTP 401） */
export class AuthenticationError extends ApiError {
  constructor() {
    super(
      'Invalid or missing API key. Run `dmxapi config set apiKey <key>` or set DMXAPI_API_KEY.',
      401,
    );
    this.name = 'AuthenticationError';
  }
}

/** 频率限制错误（HTTP 429） */
export class RateLimitError extends ApiError {
  constructor(
    /** 建议等待时间（毫秒），来自 Retry-After 头 */
    public readonly retryAfterMs?: number,
  ) {
    super('Rate limited. Please wait and try again.', 429);
    this.name = 'RateLimitError';
  }
}

/** 配置错误（缺失必要配置项等） */
export class ConfigError extends DmxapiError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

/** 模型无匹配处理器（在 ProviderRegistry 中未找到对应 handler） */
export class UnknownModelError extends DmxapiError {
  constructor(model: string, capability: Capability) {
    super(
      `No handler for model "${model}" with capability "${capability}". Run \`dmxapi models --capability ${capability}\` to see available models.`,
      'UNKNOWN_MODEL',
    );
    this.name = 'UnknownModelError';
  }
}

/** 异步任务执行失败 */
export class TaskFailedError extends DmxapiError {
  constructor(taskId: string, reason?: string) {
    super(`Task ${taskId} failed: ${reason ?? 'unknown reason'}`, 'TASK_FAILED');
    this.name = 'TaskFailedError';
  }
}

/** 异步任务轮询超时 */
export class TaskTimeoutError extends DmxapiError {
  constructor(taskId: string) {
    super(
      `Task ${taskId} timed out. Check status with: dmxapi task status ${taskId}`,
      'TASK_TIMEOUT',
    );
    this.name = 'TaskTimeoutError';
  }
}
