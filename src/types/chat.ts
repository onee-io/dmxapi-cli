/**
 * @module types/chat
 * @description 文本对话（Chat）相关类型定义
 *
 * 定义了对话请求、响应、消息结构和流式输出 chunk 的类型。
 * 兼容 OpenAI Chat Completions API 格式。
 */

import type { BaseRequest, BaseResponse } from './capability.js';

/** 对话消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  /** 消息内容，纯文本或多模态内容（文本+图片） */
  content: string | ChatContentPart[];
}

/** 多模态消息内容块（用于视觉模型，支持文本和图片混合输入） */
export interface ChatContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/** 对话请求参数 */
export interface ChatRequest extends BaseRequest {
  messages: ChatMessage[];
  /** 采样温度，0-2，越高越随机 */
  temperature?: number;
  /** 最大生成 token 数 */
  maxTokens?: number;
  /** 核采样参数 */
  topP?: number;
  /** 是否启用流式输出 */
  stream?: boolean;
}

/** 对话响应（非流式） */
export interface ChatResponse extends BaseResponse {
  /** 模型生成的文本内容 */
  content: string;
  /** 停止原因，如 "stop"、"length" */
  finishReason: string;
}

/** 流式输出的单个数据块 */
export interface ChatStreamChunk {
  /** 本次增量文本内容 */
  content: string;
  /** 停止原因，仅在最后一个 chunk 中出现 */
  finishReason?: string;
}
