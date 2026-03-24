/**
 * @module providers
 * @description Provider 统一注册入口
 *
 * 所有 provider handler 在此集中注册到 ProviderRegistry。
 * 目录按能力类型组织：chat/、image/、video/、music/ 等，
 * 每个目录下按提供商/协议命名文件（如 openai-compat.ts、gemini.ts）。
 *
 * 新增 handler 时，只需在此文件中 import 并调用注册函数即可。
 */

import type { ProviderRegistry } from './registry.js';
import { registerOpenAICompatChat } from './chat/openai-compat.js';
import { registerOpenAICompatImage } from './image/openai-compat.js';

/** 注册所有 provider handler 到 registry */
export function registerAllProviders(registry: ProviderRegistry): void {
  // --- Chat ---
  registerOpenAICompatChat(registry);

  // --- Image ---
  registerOpenAICompatImage(registry);

  // 后续扩展在此添加，例如：
  // registerGeminiImage(registry);    // image/gemini.ts
  // registerSoraVideo(registry);      // video/sora.ts
  // registerSunoMusic(registry);      // music/suno.ts
}
