/**
 * @module types/config
 * @description 配置类型定义
 *
 * DmxapiConfig 是用户可配置的选项（所有字段可选），
 * ResolvedConfig 是合并默认值后的最终配置（所有字段必填）。
 *
 * 配置优先级：CLI flags > 环境变量 > 配置文件(~/.dmxapi/config.json) > 内置默认值
 */

/** 用户配置接口（所有字段可选，用于配置文件和环境变量） */
export interface DmxapiConfig {
  /** DMXAPI API 密钥 */
  apiKey?: string;
  /** API 基础 URL，默认 https://www.dmxapi.cn */
  baseUrl?: string;
  /** 各能力的默认模型 */
  defaults?: {
    chatModel?: string;   // 默认对话模型
    imageModel?: string;  // 默认图片生成模型
    videoModel?: string;  // 默认视频生成模型
    musicModel?: string;  // 默认音乐生成模型
    ttsModel?: string;    // 默认语音合成模型
    ttsVoice?: string;    // 默认音色
  };
  /** HTTP 请求配置 */
  http?: {
    timeout?: number;  // 请求超时（毫秒）
    retries?: number;  // 重试次数
  };
  /** 输出配置 */
  output?: {
    format?: 'text' | 'json';  // 输出格式
    saveDir?: string;           // 默认文件保存目录
  };
  /** 模型别名映射，如 { "fast": "gpt-4o-mini" } */
  modelAliases?: Record<string, string>;
}

/** 解析后的完整配置（所有字段均已填充默认值） */
export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  defaults: {
    chatModel: string;
    imageModel: string;
    videoModel: string;
    musicModel: string;
    ttsModel: string;
    ttsVoice: string;
  };
  http: {
    timeout: number;
    retries: number;
  };
  output: {
    format: 'text' | 'json';
    saveDir: string;
  };
  modelAliases: Record<string, string>;
}
