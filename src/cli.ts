/**
 * @module cli
 * @description CLI 程序构建器
 *
 * 创建并配置 Commander 程序实例，注册全局选项、provider 和命令。
 * 此模块是程序的组装点，将所有组件连接在一起。
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerCommands } from './commands/index.js';
import { registry } from './providers/registry.js';
import { registerAllProviders } from './providers/index.js';

// 动态读取 package.json 版本号
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

/** 创建并返回配置完成的 CLI 程序实例 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('dmxapi')
    .description('Unified CLI for DMXAPI - AI model API aggregation platform')
    .version(packageJson.version)
    .option('--api-key <key>', 'API key (overrides env/config)')
    .option('--base-url <url>', 'Base URL (overrides env/config)')
    .option('--output <format>', 'Output format: text | json', 'text')
    .option('--output-file <path>', 'Save output to file')
    .option('--verbose', 'Enable debug logging')
    .option('--no-color', 'Disable colored output')
    .option('--timeout <ms>', 'Request timeout in milliseconds');

  // 注册所有 provider handler 到全局 registry
  registerAllProviders(registry);

  // 注册所有 CLI 命令
  registerCommands(program);

  return program;
}
