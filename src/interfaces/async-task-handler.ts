/**
 * @module interfaces/async-task-handler
 * @description 异步任务处理器接口
 *
 * 用于耗时较长的生成任务（如视频、音乐），采用 submit + poll 模式：
 * 1. submit() - 提交生成任务，立即返回 taskId
 * 2. poll()   - 轮询任务状态，直到完成或失败
 *
 * 与 ICapabilityHandler 的区别：ICapabilityHandler 是同步的（请求→等待→响应），
 * 而 IAsyncTaskHandler 是异步的（提交→轮询→获取结果）。
 */

import type { Capability, TaskSubmitResult, TaskStatusResult } from '../types/index.js';
import type { ExecutionContext } from './capability-handler.js';

/**
 * 异步任务处理器接口
 *
 * @typeParam TReq - 请求类型（如 VideoRequest、MusicRequest）
 * @typeParam TResult - 最终结果类型（如 VideoResult、MusicResult）
 */
export interface IAsyncTaskHandler<TReq, TResult> {
  readonly capability: Capability;
  readonly supportedModels: string[];
  /** 提交异步任务 */
  submit(request: TReq, ctx: ExecutionContext): Promise<TaskSubmitResult>;
  /** 查询任务状态和结果 */
  poll(taskId: string, ctx: ExecutionContext): Promise<TaskStatusResult<TResult>>;
}
