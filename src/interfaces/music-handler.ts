/**
 * @module interfaces/music-handler
 * @description 音乐生成处理器接口
 *
 * 继承 IAsyncTaskHandler，采用异步任务模式（submit + poll）。
 */

import type { Capability } from '../types/index.js';
import type { MusicRequest, MusicResult } from '../types/index.js';
import type { IAsyncTaskHandler } from './async-task-handler.js';

/** 音乐生成处理器接口 */
export interface IMusicHandler extends IAsyncTaskHandler<MusicRequest, MusicResult> {
  readonly capability: Capability.Music;
}
