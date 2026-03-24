/**
 * @module providers/chat/openai-compat
 * @description OpenAI 兼容格式的对话处理器
 *
 * DMXAPI 平台上大部分对话模型都兼容 OpenAI Chat Completions API 格式，
 * 因此此 handler 注册为 ["*"] 通配模式 + priority=0，作为通用 fallback。
 *
 * 支持：
 * - 同步请求（execute）→ POST /v1/chat/completions
 * - 流式请求（stream）→ POST /v1/chat/completions (stream=true, SSE)
 */

import { Capability } from '../../types/index.js';
import type {
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
} from '../../types/index.js';
import type { IChatHandler } from '../../interfaces/index.js';
import type { ExecutionContext } from '../../interfaces/index.js';
import type { ProviderRegistry } from '../registry.js';

/** OpenAI 兼容的对话处理器实现 */
export class OpenAICompatChatHandler implements IChatHandler {
  readonly capability = Capability.Chat;
  readonly supportedModels = ['*']; // 通配所有模型（fallback）

  /** 同步对话请求 */
  async execute(request: ChatRequest, ctx: ExecutionContext): Promise<ChatResponse> {
    const body = this.buildRequestBody(request, false);

    const data = await ctx.httpClient.request<any>('/v1/chat/completions', { body });

    const choice = data.choices?.[0];
    return {
      model: data.model ?? request.model,
      content: choice?.message?.content ?? '',
      finishReason: choice?.finish_reason ?? 'stop',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  /** 流式对话请求，逐 chunk yield */
  async *stream(request: ChatRequest, ctx: ExecutionContext): AsyncIterable<ChatStreamChunk> {
    const body = this.buildRequestBody(request, true);

    for await (const data of ctx.httpClient.stream('/v1/chat/completions', { body })) {
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          yield {
            content: delta.content,
            finishReason: parsed.choices[0].finish_reason ?? undefined,
          };
        }
      } catch {
        // 跳过无法解析的 chunk（如空行或格式异常）
      }
    }
  }

  /**
   * 构造 OpenAI Chat Completions API 请求体
   *
   * 将内部的 camelCase 字段名转换为 API 需要的 snake_case 格式，
   * 并通过 extra 字段透传提供商特有参数。
   */
  private buildRequestBody(request: ChatRequest, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream,
    };

    if (request.temperature != null) body.temperature = request.temperature;
    if (request.maxTokens != null) body.max_tokens = request.maxTokens;
    if (request.topP != null) body.top_p = request.topP;

    // 透传 extra 参数（通过 CLI 的 -p key=value 传入）
    if (request.extra) {
      Object.assign(body, request.extra);
    }

    return body;
  }
}

/** 将 OpenAI 兼容对话 handler 注册到 registry（priority=0，通用 fallback） */
export function registerOpenAICompatChat(registry: ProviderRegistry): void {
  registry.register(Capability.Chat, new OpenAICompatChatHandler(), ['*'], 0);
}
