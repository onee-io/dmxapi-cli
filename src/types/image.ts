/**
 * @module types/image
 * @description 图片生成（Image）相关类型定义
 *
 * 定义了文生图的请求参数和响应结构。
 * size 使用比例格式（如 "1:1"、"16:9"），各 provider handler 负责转换为 API 所需格式。
 * quality 使用分辨率等级（"1K"、"2K"、"4K"）。
 */

import type { BaseRequest, BaseResponse } from './capability.js';

/** 图片比例可选值 */
export type ImageAspectRatio =
  | 'auto'
  | '1:1'
  | '2:3' | '3:2'
  | '3:4' | '4:3'
  | '4:5' | '5:4'
  | '9:16' | '16:9'
  | '21:9';

/** 图片分辨率/质量等级 */
export type ImageQuality = '1K' | '2K' | '4K';

/** 输入图片数据（用于图片编辑） */
export interface ImageInput {
  /** base64 编码的图片数据 */
  data: string;
  /** MIME 类型，如 "image/png"、"image/jpeg" */
  mimeType: string;
}

/** 图片生成/编辑请求参数 */
export interface ImageRequest extends BaseRequest {
  /** 图片描述提示词 */
  prompt: string;
  /** 输入图片数组（用于图片编辑/多图融合） */
  images?: ImageInput[];
  /** 图片比例。可选值：auto, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 */
  size?: string;
  /** 图片分辨率/质量等级。可选值：1K（默认）、2K、4K */
  quality?: string;
  /** 生成图片数量 */
  n?: number;
  /** 是否启用联网搜索增强（部分模型支持，如 Gemini、Seedream） */
  webSearch?: boolean;
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
