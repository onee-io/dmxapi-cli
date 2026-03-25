/**
 * @module core/config-manager
 * @description 配置管理器
 *
 * 负责从多个来源加载、合并和持久化配置。
 *
 * 配置优先级（从高到低）：
 * 1. CLI 命令行标志（--api-key, --base-url 等）
 * 2. 环境变量（DMXAPI_API_KEY, DMXAPI_BASE_URL 等）
 * 3. 配置文件（~/.dmxapi/config.json）
 * 4. 内置默认值
 *
 * 高优先级的值会覆盖低优先级的值，嵌套对象使用深度合并。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { DmxapiConfig, ResolvedConfig } from '../types/index.js';
import { ConfigError } from './errors.js';

/** 配置文件存放目录 */
const CONFIG_DIR = join(homedir(), '.dmxapi');
/** 配置文件完整路径 */
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/** 内置默认配置（最低优先级） */
const DEFAULTS: ResolvedConfig = {
  apiKey: '',
  baseUrl: 'https://www.dmxapi.cn',
  defaults: {
    chatModel: 'gpt-5-mini',
    imageModel: 'gemini-3.1-flash-image-preview',
    videoModel: 'sora-2',
    musicModel: 'suno',
    ttsModel: 'tts-1',
    ttsVoice: 'alloy',
  },
  http: {
    timeout: 180000,  // 180 秒，图片生成等操作耗时较长
    retries: 2,
  },
  output: {
    format: 'text',
    saveDir: '.',
  },
  modelAliases: {},
};

/** 从配置文件加载配置（如果文件不存在或解析失败，返回空对象） */
function loadFileConfig(): DmxapiConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/** 从环境变量加载配置 */
function loadEnvConfig(): DmxapiConfig {
  const config: DmxapiConfig = {};
  if (process.env.DMXAPI_API_KEY) config.apiKey = process.env.DMXAPI_API_KEY;
  if (process.env.DMXAPI_BASE_URL) config.baseUrl = process.env.DMXAPI_BASE_URL;
  if (process.env.DMXAPI_DEFAULT_CHAT_MODEL) {
    config.defaults = { ...config.defaults, chatModel: process.env.DMXAPI_DEFAULT_CHAT_MODEL };
  }
  if (process.env.DMXAPI_DEFAULT_IMAGE_MODEL) {
    config.defaults = { ...config.defaults, imageModel: process.env.DMXAPI_DEFAULT_IMAGE_MODEL };
  }
  if (process.env.DMXAPI_TIMEOUT) {
    config.http = { ...config.http, timeout: parseInt(process.env.DMXAPI_TIMEOUT, 10) };
  }
  return config;
}

/**
 * 深度合并多个配置对象
 *
 * 对嵌套对象递归合并（而非直接覆盖），确保只覆盖明确指定的字段。
 * 例如：用户只设置了 defaults.chatModel，不会丢失其他 defaults 字段的默认值。
 */
function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target };
  for (const source of sources) {
    for (const key of Object.keys(source) as (keyof T)[]) {
      const val = source[key];
      if (val === undefined) continue;
      // 对象类型递归合并（排除数组和 Buffer）
      if (val && typeof val === 'object' && !Array.isArray(val) && !Buffer.isBuffer(val)) {
        result[key] = deepMerge(
          (result[key] as Record<string, any>) || {},
          val as Record<string, any>,
        ) as T[keyof T];
      } else {
        result[key] = val as T[keyof T];
      }
    }
  }
  return result;
}

/**
 * 合并所有配置来源，返回完整的 ResolvedConfig
 * @param cliFlags CLI 命令行传入的配置覆盖项
 */
export function resolveConfig(cliFlags: Partial<DmxapiConfig> = {}): ResolvedConfig {
  const fileConfig = loadFileConfig();
  const envConfig = loadEnvConfig();
  // 按优先级从低到高依次合并：默认值 ← 文件 ← 环境变量 ← CLI 标志
  // DEFAULTS 已包含所有必填字段的默认值，合并后的结果一定是完整的 ResolvedConfig
  return deepMerge(DEFAULTS, fileConfig as Partial<ResolvedConfig>, envConfig as Partial<ResolvedConfig>, cliFlags as Partial<ResolvedConfig>);
}

/** 检查 API Key 是否已配置，未配置则抛出 ConfigError 并给出设置提示 */
export function requireApiKey(config: ResolvedConfig): void {
  if (!config.apiKey) {
    throw new ConfigError(
      'API key is required. Set it via:\n' +
        '  dmxapi config set apiKey <key>\n' +
        '  export DMXAPI_API_KEY=<key>\n' +
        '  --api-key <key>',
    );
  }
}

/**
 * 读取配置文件中的指定字段
 * @param key 支持点号分隔的路径，如 "defaults.chatModel"
 */
export function configGet(key: string): string | undefined {
  const config = loadFileConfig();
  const parts = key.split('.');
  let current: any = config;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current != null ? String(current) : undefined;
}

/**
 * 设置配置文件中的指定字段
 * @param key 支持点号分隔的路径，如 "defaults.chatModel"
 * @param value 值（自动尝试解析为 number/boolean）
 */
export function configSet(key: string, value: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const config = loadFileConfig();
  const parts = key.split('.');
  // 逐级创建嵌套对象
  let current: any = config;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] == null || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  // 自动类型推断：true/false → boolean，纯数字 → number，其他 → string
  const lastKey = parts[parts.length - 1];
  if (value === 'true') current[lastKey] = true;
  else if (value === 'false') current[lastKey] = false;
  else if (/^\d+$/.test(value)) current[lastKey] = parseInt(value, 10);
  else current[lastKey] = value;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

/** 列出配置文件中的所有配置项 */
export function configList(): DmxapiConfig {
  return loadFileConfig();
}

/** 返回配置文件的完整路径 */
export function configPath(): string {
  return CONFIG_FILE;
}
