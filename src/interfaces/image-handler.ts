/**
 * @module interfaces/image-handler
 * @description 图片生成处理器接口
 *
 * 图片生成是同步操作（请求后直接返回结果），
 * 直接继承 ICapabilityHandler 即可。
 */

import type { Capability } from '../types/index.js';
import type { ImageRequest, ImageResponse } from '../types/index.js';
import type { ICapabilityHandler } from './capability-handler.js';

/** 图片生成处理器接口 */
export interface IImageHandler extends ICapabilityHandler<ImageRequest, ImageResponse> {
  readonly capability: Capability.Image;
}
