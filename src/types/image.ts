/**
 * @module types/image
 * @description 图片生成（Image）相关类型定义
 *
 * 定义了文生图的请求参数和响应结构。
 * 兼容 OpenAI Images API 格式。
 */

import type { BaseRequest, BaseResponse } from './capability.js';

/** 图片生成请求参数 */
export interface ImageRequest extends BaseRequest {
  /** 图片描述提示词 */
  prompt: string;
  /** 反向提示词，描述不希望出现的内容（部分模型支持） */
  negativePrompt?: string;
  /** 图片尺寸，如 "1024x1024"、"1792x1024" */
  size?: string;
  /** 图片质量，如 "standard"、"hd" */
  quality?: string;
  /** 图片风格，如 "natural"、"vivid" */
  style?: string;
  /** 生成图片数量 */
  n?: number;
}

/** 图片生成响应 */
export interface ImageResponse extends BaseResponse {
  images: ImageResult[];
}

/** 单张生成图片的结果 */
export interface ImageResult {
  /** 图片 URL（与 b64Json 二选一） */
  url?: string;
  /** Base64 编码的图片数据 */
  b64Json?: string;
  /** 模型修正后的提示词（部分模型会优化用户的 prompt） */
  revisedPrompt?: string;
}
