/**
 * @module interfaces/chat-handler
 * @description 对话处理器接口
 *
 * 在 ICapabilityHandler 基础上扩展了 stream() 方法，
 * 支持 SSE（Server-Sent Events）流式输出，实现打字机效果。
 */

import type { Capability } from '../types/index.js';
import type { ChatRequest, ChatResponse, ChatStreamChunk } from '../types/index.js';
import type { ICapabilityHandler, ExecutionContext } from './capability-handler.js';

/** 对话处理器接口，同时支持同步和流式两种调用模式 */
export interface IChatHandler extends ICapabilityHandler<ChatRequest, ChatResponse> {
  readonly capability: Capability.Chat;
  /** 流式生成，返回异步可迭代对象，逐 chunk 输出 */
  stream(request: ChatRequest, ctx: ExecutionContext): AsyncIterable<ChatStreamChunk>;
}
