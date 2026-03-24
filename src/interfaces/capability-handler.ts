/**
 * @module interfaces/capability-handler
 * @description 基础能力处理器接口与执行上下文
 *
 * 这是整个 provider 体系的核心抽象。所有同步能力（chat、image、tts）的处理器
 * 都实现 ICapabilityHandler 接口。每个处理器声明自己支持的能力类型和模型模式，
 * 由 ProviderRegistry 负责根据模型名称匹配到正确的处理器。
 *
 * ExecutionContext 为处理器提供运行时所需的依赖（HTTP 客户端、配置、日志等），
 * 采用依赖注入模式，便于测试和解耦。
 */

import type { Capability } from '../types/index.js';
import type { HttpClient } from '../core/http-client.js';
import type { ResolvedConfig } from '../types/index.js';
import type { Logger } from '../core/logger.js';

/** 处理器执行上下文，提供运行时依赖 */
export interface ExecutionContext {
  /** HTTP 客户端，已配置好 baseUrl、apiKey、重试策略 */
  httpClient: HttpClient;
  /** 合并后的完整配置 */
  config: ResolvedConfig;
  /** 日志实例 */
  logger: Logger;
  /** 取消信号，用于 Ctrl+C 中断 */
  signal?: AbortSignal;
}

/**
 * 能力处理器基础接口（泛型）
 *
 * @typeParam TReq - 请求类型（如 ChatRequest、ImageRequest）
 * @typeParam TRes - 响应类型（如 ChatResponse、ImageResponse）
 */
export interface ICapabilityHandler<TReq, TRes> {
  /** 此处理器对应的能力类型 */
  readonly capability: Capability;
  /** 支持的模型 glob 模式列表，如 ["gpt-*", "claude-*"] 或 ["*"]（通配所有） */
  readonly supportedModels: string[];
  /** 执行请求并返回结果 */
  execute(request: TReq, ctx: ExecutionContext): Promise<TRes>;
}
