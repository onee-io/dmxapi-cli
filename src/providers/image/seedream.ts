/**
 * @module providers/image/seedream
 * @description Seedream（豆包即梦）图片生成处理器
 *
 * 使用 DMXAPI 代理的火山引擎 Seedream API 实现图片生成。
 * 端点：POST /v1/responses（OpenAI Responses API 格式）
 *
 * 与 OpenAI/Gemini 的关键差异：
 * - prompt 字段为 `input`（非 `prompt`）
 * - 图片以 Markdown 链接形式返回在文本中
 * - 多图通过 `sequential_image_generation` 控制
 * - size 支持分辨率关键词（"2K"/"3K"）或像素值
 *
 * 注册为 ["doubao-seedream-*"] 模式 + priority=10。
 */

import { Capability } from '../../types/index.js';
import type { ImageRequest, ImageResponse, ImageResult } from '../../types/index.js';
import type { IImageHandler } from '../../interfaces/index.js';
import type { ExecutionContext } from '../../interfaces/index.js';
import type { ProviderRegistry } from '../registry.js';

/** Seedream 响应结构 */
interface SeedreamResponse {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    image_url?: {
      url?: string;
    };
    type?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

/** 比例 + 分辨率 → Seedream 像素尺寸映射 */
const SIZE_MAP: Record<string, Record<string, string>> = {
  '2K': {
    '1:1': '2048x2048',
    '2:3': '1664x2496', '3:2': '2496x1664',
    '3:4': '1728x2304', '4:3': '2304x1728',
    '4:5': '1824x2280', '5:4': '2280x1824',
    '9:16': '1600x2848', '16:9': '2848x1600',
    '21:9': '3136x1344',
  },
  '3K': {
    '1:1': '3072x3072',
    '2:3': '2496x3744', '3:2': '3744x2496',
    '3:4': '2592x3456', '4:3': '3456x2592',
    '4:5': '2736x3420', '5:4': '3420x2736',
    '9:16': '2304x4096', '16:9': '4096x2304',
    '21:9': '4704x2016',
  },
};

/** 将接口层的 quality/size 转换为 Seedream 的 size 参数 */
function resolveSeedreamSize(request: ImageRequest): string {
  // quality 映射：1K→2K, 4K→3K（Seedream 只支持 2K/3K）
  let resolution = '2K';
  if (request.quality) {
    if (request.quality === '3K' || request.quality === '4K') {
      resolution = '3K';
    }
  }

  // 无比例或 auto → 直接用分辨率关键词
  if (!request.size || request.size === 'auto') {
    return resolution;
  }

  // 有比例 → 查像素值表
  return SIZE_MAP[resolution]?.[request.size] ?? resolution;
}

/** Seedream 图片生成处理器实现 */
export class SeedreamImageHandler implements IImageHandler {
  readonly capability = Capability.Image;
  readonly supportedModels = ['doubao-seedream-*'];

  /** 执行图片生成请求 */
  async execute(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    const body = this.buildRequestBody(request);

    const data = await ctx.httpClient.request<SeedreamResponse>('/v1/responses', { body });
    const images = this.parseResponse(data);

    return {
      model: request.model,
      images,
    };
  }

  /** 构建 Seedream 请求体 */
  private buildRequestBody(request: ImageRequest): Record<string, unknown> {
    const count = request.n ?? 1;

    const body: Record<string, unknown> = {
      model: request.model,
      input: request.prompt,
      size: resolveSeedreamSize(request),
      sequential_image_generation: count > 1 ? 'auto' : 'disabled',
      sequential_image_generation_options: { max_images: count },
      stream: false,
      output_format: 'png',
      response_format: 'url',
      watermark: false,
    };

    // 联网搜索（仅 5.0-lite 支持）
    if (request.webSearch) {
      body.tools = [{ type: 'web_search' }];
    }

    // 输入图片（图片编辑/多图融合），转为 data URI 数组
    const inputImages = request.images ?? [];
    if (inputImages.length > 0) {
      body.image = inputImages.map(img =>
        `data:${img.mimeType};base64,${img.data}`
      );
    }

    // 透传 extra 参数到请求体顶层
    if (request.extra) {
      Object.assign(body, request.extra);
    }

    return body;
  }

  /** 解析 Seedream 响应，支持两种格式：Markdown 文本（文生图）和 image_url 对象（图片编辑） */
  private parseResponse(data: SeedreamResponse): ImageResult[] {
    const images: ImageResult[] = [];
    if (!data.output?.length) return images;

    for (const item of data.output) {
      // 格式 1：图片编辑返回 image_url 对象
      if (item.type === 'image_url' && item.image_url?.url) {
        images.push({ url: item.image_url.url });
        continue;
      }

      // 格式 2：文生图返回 Markdown 文本
      const text = item.content?.[0]?.text;
      if (text) {
        const regex = /!\[.*?\]\((.*?)\)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          images.push({ url: match[1] });
        }
      }
    }

    return images;
  }
}

/** 将 Seedream 图片生成 handler 注册到 registry（priority=10） */
export function registerSeedreamImage(registry: ProviderRegistry): void {
  registry.register(Capability.Image, new SeedreamImageHandler(), ['doubao-seedream-*'], 10);
}
