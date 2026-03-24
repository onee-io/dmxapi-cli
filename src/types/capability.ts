/**
 * @module types/capability
 * @description 能力枚举与基础类型定义
 *
 * 定义了 dmxapi-cli 支持的所有 AI 能力类型，以及所有请求/响应的公共基础接口。
 * 每种具体能力（chat、image 等）的类型都继承自这里的基础类型。
 */

/** 支持的 AI 能力类型 */
export enum Capability {
  Chat = 'chat',     // 文本对话（文生文）
  Image = 'image',   // 图片生成（文生图）
  Video = 'video',   // 视频生成（文生视频）
  Music = 'music',   // 音乐生成（文生音乐）
  TTS = 'tts',       // 语音合成（文字转语音）
}

/** 所有请求的公共基础接口 */
export interface BaseRequest {
  /** 模型标识符，如 "gpt-4o-mini"、"dall-e-3" */
  model: string;
  /** 透传参数，用于传递提供商特有的参数，通过 CLI 的 -p key=value 设置 */
  extra?: Record<string, unknown>;
}

/** 所有响应的公共基础接口 */
export interface BaseResponse {
  /** 实际使用的模型名称（可能与请求时不同，如模型别名解析后） */
  model: string;
  /** Token 用量统计 */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}
