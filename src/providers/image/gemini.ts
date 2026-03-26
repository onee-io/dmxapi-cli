/**
 * @module providers/image/gemini
 * @description Gemini 图片生成处理器
 *
 * 使用 Google Gemini 原生的 generateContent API 实现图片生成。
 * 端点：POST /v1beta/models/{model}:generateContent
 *
 * Gemini 的图片生成是多模态生成能力的一部分，通过 responseModalities 指定输出包含图片。
 * 响应中的图片以 base64 格式内联返回（inlineData）。
 *
 * 注册为 ["gemini-*"] 模式 + priority=10，覆盖 OpenAI 兼容 handler 的 fallback。
 */

import { Capability } from '../../types/index.js';
import type { ImageRequest, ImageResponse, ImageResult } from '../../types/index.js';
import type { IImageHandler } from '../../interfaces/index.js';
import type { ExecutionContext } from '../../interfaces/index.js';
import type { ProviderRegistry } from '../registry.js';

/** Gemini generateContent 响应中的内容部分 */
interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/** Gemini generateContent 响应结构 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
      role?: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/** Gemini 图片生成处理器实现 */
export class GeminiImageHandler implements IImageHandler {
  readonly capability = Capability.Image;
  readonly supportedModels = ['gemini-*'];

  /** 执行图片生成请求 */
  async execute(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    const count = request.n ?? 1;
    const allImages: ImageResult[] = [];

    for (let i = 0; i < count; i++) {
      if (count > 1) {
        ctx.logger.debug(`Generating image ${i + 1}/${count}`);
      }

      const body = this.buildRequestBody(request);
      const path = `/v1beta/models/${request.model}:generateContent`;

      const data = await ctx.httpClient.request<GeminiResponse>(path, { body });
      const images = this.parseResponse(data);
      allImages.push(...images);
    }

    return {
      model: request.model,
      images: allImages,
    };
  }

  /** 构建 Gemini generateContent 请求体 */
  private buildRequestBody(request: ImageRequest): Record<string, unknown> {
    const generationConfig: Record<string, unknown> = {
      responseModalities: ['TEXT', 'IMAGE'],
    };

    // size 和 quality 映射到 Gemini 的 imageConfig
    const imageConfig: Record<string, unknown> = {};
    if (request.size && request.size !== 'auto') {
      imageConfig.aspectRatio = request.size;
    }
    if (request.quality) {
      imageConfig.imageSize = request.quality;
    }
    if (Object.keys(imageConfig).length > 0) {
      generationConfig.imageConfig = imageConfig;
    }

    // 构建 parts：文本 prompt + 多张输入图片
    const parts: unknown[] = [{ text: request.prompt }];
    for (const img of request.images ?? []) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }

    const body: Record<string, unknown> = {
      contents: [{ parts }],
      generationConfig,
    };

    // 联网搜索（支持 Web 搜索和图片搜索）
    if (request.webSearch) {
      body.tools = [{ google_search: { search_types: { web_search: {}, image_search: {} } } }];
    }

    // 透传 extra 参数到 generationConfig
    if (request.extra) {
      Object.assign(generationConfig, request.extra);
    }

    return body;
  }

  /** 解析 Gemini 响应，提取图片数据 */
  private parseResponse(data: GeminiResponse): ImageResult[] {
    const images: ImageResult[] = [];
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) return images;

    let revisedPrompt: string | undefined;

    for (const part of candidate.content.parts) {
      if (part.text) {
        revisedPrompt = part.text;
      } else if (part.inlineData?.data) {
        images.push({
          b64Json: part.inlineData.data,
          revisedPrompt,
        });
      }
    }

    return images;
  }
}

/** 将 Gemini 图片生成 handler 注册到 registry（priority=10，覆盖 OpenAI fallback） */
export function registerGeminiImage(registry: ProviderRegistry): void {
  registry.register(Capability.Image, new GeminiImageHandler(), ['gemini-*'], 10);
}
