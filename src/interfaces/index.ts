/**
 * @module interfaces
 * @description 抽象接口层统一导出
 *
 * 定义了所有能力处理器的接口契约，是 provider 实现的基础。
 * 接口体系分两类：
 * - 同步处理器（ICapabilityHandler）：chat、image、tts
 * - 异步任务处理器（IAsyncTaskHandler）：video、music
 */

export * from './capability-handler.js';
export * from './chat-handler.js';
export * from './image-handler.js';
export * from './async-task-handler.js';
export * from './video-handler.js';
export * from './music-handler.js';
export * from './tts-handler.js';
