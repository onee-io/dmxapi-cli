/**
 * @module types/video
 * @description 视频生成（Video）相关类型定义
 *
 * 视频生成是异步任务，使用 submit + poll 模式。
 * 请求类型配合 IAsyncTaskHandler 接口使用。
 */

import type { BaseRequest } from './capability.js';

/** 视频生成请求参数 */
export interface VideoRequest extends BaseRequest {
  /** 视频描述提示词 */
  prompt: string;
  /** 参考图片 URL，用于图生视频场景 */
  imageUrl?: string;
  /** 视频时长（秒） */
  duration?: number;
  /** 分辨率，如 "1080p"、"720p" */
  resolution?: string;
  /** 宽高比，如 "16:9"、"9:16" */
  aspectRatio?: string;
}

/** 视频生成结果 */
export interface VideoResult {
  /** 生成视频的下载 URL */
  url: string;
  /** 视频时长（秒） */
  duration?: number;
  /** 视频封面图 URL */
  coverUrl?: string;
}
