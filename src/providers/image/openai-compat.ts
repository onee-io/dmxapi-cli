/**
 * @module providers/image/openai-compat
 * @description OpenAI 兼容格式的图片生成处理器
 *
 * 兼容 OpenAI Images API 格式（POST /v1/images/generations）。
 * 注册为 ["*"] 通配模式 + priority=0，作为通用 fallback。
 */

import { Capability } from '../../types/index.js';
import type { ImageRequest, ImageResponse } from '../../types/index.js';
import type { IImageHandler } from '../../interfaces/index.js';
import type { ExecutionContext } from '../../interfaces/index.js';
import type { ProviderRegistry } from '../registry.js';

/** OpenAI 兼容的图片生成处理器实现 */
export class OpenAICompatImageHandler implements IImageHandler {
  readonly capability = Capability.Image;
  readonly supportedModels = ['*']; // 通配所有模型（fallback）

  /** 执行图片生成请求 */
  async execute(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
    };

    if (request.size) body.size = request.size;
    if (request.quality) body.quality = request.quality;
    if (request.style) body.style = request.style;
    if (request.n != null) body.n = request.n;
    if (request.negativePrompt) body.negative_prompt = request.negativePrompt;

    // 透传 extra 参数
    if (request.extra) {
      Object.assign(body, request.extra);
    }

    const data = await ctx.httpClient.request<any>('/v1/images/generations', { body });

    // 将 API 响应的 snake_case 转为内部的 camelCase
    return {
      model: data.model ?? request.model,
      images: (data.data ?? []).map((item: any) => ({
        url: item.url,
        b64Json: item.b64_json,
        revisedPrompt: item.revised_prompt,
      })),
    };
  }
}

/** 将 OpenAI 兼容图片生成 handler 注册到 registry（priority=0，通用 fallback） */
export function registerOpenAICompatImage(registry: ProviderRegistry): void {
  registry.register(Capability.Image, new OpenAICompatImageHandler(), ['*'], 0);
}
