/**
 * @module types/task
 * @description 异步任务通用类型定义
 *
 * 视频生成、音乐生成等耗时操作采用异步任务模式：
 * 1. 提交任务（submit）→ 获得 taskId
 * 2. 轮询状态（poll）→ 直到 completed 或 failed
 * 3. 获取结果 → 下载生成的文件
 */

/** 异步任务状态 */
export enum TaskStatus {
  Pending = 'pending',       // 已提交，排队中
  Processing = 'processing', // 生成中
  Completed = 'completed',   // 已完成
  Failed = 'failed',         // 失败
}

/** 任务提交后的返回结果 */
export interface TaskSubmitResult {
  /** 任务唯一标识 */
  taskId: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 预计等待时间（秒） */
  estimatedWaitSeconds?: number;
}

/** 任务状态查询结果（泛型 TResult 为任务完成后的具体结果类型） */
export interface TaskStatusResult<TResult = unknown> {
  taskId: string;
  status: TaskStatus;
  /** 生成进度，0-100 */
  progress?: number;
  /** 任务完成后的结果（仅 status=completed 时有值） */
  result?: TResult;
  /** 失败原因（仅 status=failed 时有值） */
  error?: string;
}
