/**
 * @module interfaces/video-handler
 * @description 视频生成处理器接口
 *
 * 继承 IAsyncTaskHandler，采用异步任务模式（submit + poll）。
 */

import type { Capability } from '../types/index.js';
import type { VideoRequest, VideoResult } from '../types/index.js';
import type { IAsyncTaskHandler } from './async-task-handler.js';

/** 视频生成处理器接口 */
export interface IVideoHandler extends IAsyncTaskHandler<VideoRequest, VideoResult> {
  readonly capability: Capability.Video;
}
