/**
 * @module providers/image/openai-compat
 * @description OpenAI 兼容格式的图片生成处理器
 *
 * 兼容 OpenAI Images API 格式（POST /v1/images/generations）。
 * 注册为 ["*"] 通配模式 + priority=0，作为通用 fallback。
 *
 * 接口层使用比例格式的 size（如 "1:1"、"16:9"），
 * 此 handler 负责将比例转换为 OpenAI 所需的像素尺寸（如 "1024x1024"）。
 */

import { Capability } from '../../types/index.js';
import type { ImageRequest, ImageResponse } from '../../types/index.js';
import type { IImageHandler } from '../../interfaces/index.js';
import type { ExecutionContext } from '../../interfaces/index.js';
import type { ProviderRegistry } from '../registry.js';

/** 比例 → OpenAI 像素尺寸映射 */
const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
  '1:1': '1024x1024',
  '2:3': '1024x1536',
  '3:2': '1536x1024',
  '3:4': '768x1024',
  '4:3': '1024x768',
  '4:5': '896x1120',
  '5:4': '1120x896',
  '9:16': '576x1024',
  '16:9': '1792x1024',
  '21:9': '2016x864',
};

/** OpenAI 兼容的图片生成处理器实现 */
export class OpenAICompatImageHandler implements IImageHandler {
  readonly capability = Capability.Image;
  readonly supportedModels = ['*']; // 通配所有模型（fallback）

  /** 执行图片生成或编辑请求 */
  async execute(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    // 有输入图片时走编辑端点（multipart/form-data）
    if (request.image) {
      return this.executeEdit(request, ctx);
    }
    return this.executeGenerate(request, ctx);
  }

  /** 图片生成（POST /v1/images/generations，JSON） */
  private async executeGenerate(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
    };

    if (request.size && request.size !== 'auto') {
      body.size = ASPECT_RATIO_TO_SIZE[request.size] ?? request.size;
    }
    if (request.quality) body.quality = request.quality;
    if (request.n != null) body.n = request.n;
    if (request.extra) Object.assign(body, request.extra);

    const data = await ctx.httpClient.request<any>('/v1/images/generations', { body });
    return this.parseResponse(data, request.model);
  }

  /** 图片编辑（POST /v1/images/edits，FormData） */
  private async executeEdit(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    const formData = new FormData();
    formData.append('model', request.model);
    formData.append('prompt', request.prompt);

    // base64 → Buffer → File
    const imageBuffer = Buffer.from(request.image!.data, 'base64');
    const ext = request.image!.mimeType.split('/')[1] ?? 'png';
    formData.append('image', new File([imageBuffer], `image.${ext}`, { type: request.image!.mimeType }));

    if (request.size && request.size !== 'auto') {
      formData.append('size', ASPECT_RATIO_TO_SIZE[request.size] ?? request.size);
    }
    if (request.n != null) formData.append('n', String(request.n));

    const data = await ctx.httpClient.request<any>('/v1/images/edits', { body: formData });
    return this.parseResponse(data, request.model);
  }

  /** 解析 OpenAI 图片 API 响应 */
  private parseResponse(data: any, model: string): ImageResponse {
    return {
      model: data.model ?? model,
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
