/**
 * @module types/tts
 * @description 语音合成（TTS, Text-to-Speech）相关类型定义
 *
 * 兼容 OpenAI TTS API 格式。
 */

import type { BaseRequest } from './capability.js';

/** 语音合成请求参数 */
export interface TtsRequest extends BaseRequest {
  /** 要转换为语音的文本内容 */
  input: string;
  /** 音色名称，如 "alloy"、"echo"、"nova" */
  voice?: string;
  /** 语速倍率，范围 0.25-4.0 */
  speed?: number;
  /** 输出音频格式 */
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
}

/** 语音合成响应 */
export interface TtsResponse {
  /** 生成的音频二进制数据 */
  audioData: Buffer;
  /** 音频格式 */
  format: string;
}
