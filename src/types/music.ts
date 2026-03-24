/**
 * @module types/music
 * @description 音乐生成（Music）相关类型定义
 *
 * 音乐生成是异步任务，使用 submit + poll 模式。
 * 请求类型配合 IAsyncTaskHandler 接口使用。
 */

import type { BaseRequest } from './capability.js';

/** 音乐生成请求参数 */
export interface MusicRequest extends BaseRequest {
  /** 音乐描述提示词 */
  prompt: string;
  /** 音乐风格，如 "pop"、"classical"、"electronic" */
  style?: string;
  /** 音乐时长（秒） */
  duration?: number;
  /** 是否纯器乐（无人声） */
  instrumental?: boolean;
  /** 自定义歌词 */
  lyrics?: string;
}

/** 音乐生成结果 */
export interface MusicResult {
  /** 生成音频的下载 URL */
  url: string;
  /** 曲目标题 */
  title?: string;
  /** 音乐时长（秒） */
  duration?: number;
  /** 生成的歌词 */
  lyrics?: string;
}
