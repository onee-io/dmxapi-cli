/**
 * @module interfaces/tts-handler
 * @description 语音合成处理器接口
 *
 * 语音合成是同步操作，直接继承 ICapabilityHandler。
 */

import type { Capability } from '../types/index.js';
import type { TtsRequest, TtsResponse } from '../types/index.js';
import type { ICapabilityHandler } from './capability-handler.js';

/** 语音合成处理器接口 */
export interface ITtsHandler extends ICapabilityHandler<TtsRequest, TtsResponse> {
  readonly capability: Capability.TTS;
}
