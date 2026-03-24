/**
 * @module utils/model-resolver
 * @description 模型解析器
 *
 * 将用户输入的模型名称解析为实际的 handler 和最终模型名称。
 * 解析流程：
 * 1. 如果未指定模型，使用配置中的默认模型
 * 2. 检查模型别名（如 "fast" → "gpt-4o-mini"）
 * 3. 通过 ProviderRegistry 匹配对应的 handler
 */

import type { Capability, ResolvedConfig } from '../types/index.js';
import type { ProviderRegistry } from '../providers/registry.js';
import type { ICapabilityHandler, IAsyncTaskHandler } from '../interfaces/index.js';

type AnyHandler = ICapabilityHandler<any, any> | IAsyncTaskHandler<any, any>;

/**
 * 解析模型名称，返回匹配的 handler 和最终模型名
 *
 * @param registry Provider 注册中心
 * @param capability 能力类型
 * @param model 用户指定的模型名（可能为 undefined，此时使用默认模型）
 * @param config 已解析的配置
 * @returns handler 实例和最终确定的模型名
 */
export function resolveModel(
  registry: ProviderRegistry,
  capability: Capability,
  model: string | undefined,
  config: ResolvedConfig,
): { handler: AnyHandler; model: string } {
  // 未指定模型时，使用对应能力的默认模型
  let resolvedModel = model ?? getDefaultModel(capability, config);
  // 应用模型别名映射
  if (config.modelAliases[resolvedModel]) {
    resolvedModel = config.modelAliases[resolvedModel];
  }

  const handler = registry.resolve(capability, resolvedModel);
  return { handler, model: resolvedModel };
}

/** 获取指定能力类型的默认模型名称 */
function getDefaultModel(capability: Capability, config: ResolvedConfig): string {
  const map: Record<string, string> = {
    chat: config.defaults.chatModel,
    image: config.defaults.imageModel,
    video: config.defaults.videoModel,
    music: config.defaults.musicModel,
    tts: config.defaults.ttsModel,
  };
  return map[capability] ?? '';
}
