/**
 * @module providers/registry
 * @description Provider 注册中心
 *
 * 这是整个 provider 体系的核心调度器。所有 handler 在启动时注册到 registry，
 * 运行时通过 (capability, model) 查找匹配的 handler。
 *
 * 匹配机制：
 * - 每个 handler 注册时声明支持的模型 glob 模式（如 ["gpt-*"]、["*"]）
 * - 同一能力下可注册多个 handler，通过 priority 决定优先级
 * - 解析时从高优先级到低优先级逐个匹配，命中即返回
 *
 * 设计意图：
 * - OpenAI 兼容 handler 注册 ["*"] + priority=0，作为通用 fallback
 * - 特殊 handler（如 Suno）注册具体 pattern + 更高 priority，覆盖 fallback
 */

import micromatch from 'micromatch';
import { Capability } from '../types/index.js';
import type { ICapabilityHandler } from '../interfaces/index.js';
import type { IAsyncTaskHandler } from '../interfaces/index.js';
import { UnknownModelError } from '../core/errors.js';

/** 同步或异步处理器的联合类型 */
type AnyHandler = ICapabilityHandler<any, any> | IAsyncTaskHandler<any, any>;

/** 注册表内部条目 */
interface HandlerEntry {
  handler: AnyHandler;
  /** 支持的模型 glob 模式列表 */
  modelPatterns: string[];
  /** 优先级，数值越大越优先匹配 */
  priority: number;
}

/** 模型信息（用于 `dmxapi models` 命令展示） */
export interface ModelInfo {
  capability: Capability;
  patterns: string[];
  handlerName: string;
}

/**
 * Provider 注册中心
 *
 * 职责：
 * 1. 注册 handler（register）
 * 2. 根据 capability + model 名称解析 handler（resolve）
 * 3. 列出所有已注册的模型信息（listModels）
 */
export class ProviderRegistry {
  /** 按能力类型分组的 handler 注册表 */
  private handlers = new Map<Capability, HandlerEntry[]>();

  /**
   * 注册一个 handler
   * @param capability 能力类型
   * @param handler 处理器实例
   * @param modelPatterns 支持的模型 glob 模式，如 ["gpt-*", "claude-*"] 或 ["*"]
   * @param priority 优先级（默认 0），数值越大越优先被匹配
   */
  register(
    capability: Capability,
    handler: AnyHandler,
    modelPatterns: string[],
    priority = 0,
  ): void {
    if (!this.handlers.has(capability)) {
      this.handlers.set(capability, []);
    }
    this.handlers.get(capability)!.push({ handler, modelPatterns, priority });
    // 按优先级降序排列，确保高优先级的 handler 先被匹配
    this.handlers.get(capability)!.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 根据能力类型和模型名称解析匹配的 handler
   * @throws UnknownModelError 如果没有找到匹配的 handler
   */
  resolve<T extends AnyHandler>(capability: Capability, model: string): T {
    const entries = this.handlers.get(capability);
    if (!entries?.length) {
      throw new UnknownModelError(model, capability);
    }

    // 从高优先级到低优先级逐个匹配
    for (const entry of entries) {
      if (micromatch.isMatch(model, entry.modelPatterns)) {
        return entry.handler as T;
      }
    }

    throw new UnknownModelError(model, capability);
  }

  /** 列出所有已注册的模型信息，可按能力类型过滤 */
  listModels(capability?: Capability): ModelInfo[] {
    const result: ModelInfo[] = [];
    const caps = capability ? [capability] : Object.values(Capability);

    for (const cap of caps) {
      const entries = this.handlers.get(cap as Capability);
      if (!entries) continue;
      for (const entry of entries) {
        result.push({
          capability: cap as Capability,
          patterns: entry.modelPatterns,
          handlerName: entry.handler.constructor?.name ?? 'anonymous',
        });
      }
    }
    return result;
  }
}

/** 全局 registry 单例 */
export const registry = new ProviderRegistry();
