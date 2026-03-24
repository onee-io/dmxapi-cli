/**
 * @module commands/config
 * @description config 命令 —— 配置管理
 *
 * 用法：
 *   dmxapi config get <key>       读取配置项
 *   dmxapi config set <key> <val> 设置配置项
 *   dmxapi config list            列出所有配置
 *   dmxapi config path            显示配置文件路径
 *
 * 配置文件位于 ~/.dmxapi/config.json，支持点号分隔的嵌套路径（如 defaults.chatModel）。
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { configGet, configSet, configList, configPath } from '../core/config-manager.js';

/** 注册 config 命令到 Commander 程序 */
export function registerConfigCommand(program: Command): void {
  const cmd = program
    .command('config')
    .description('Manage configuration');

  cmd
    .command('get <key>')
    .description('Get a config value (e.g., apiKey, defaults.chatModel)')
    .action((key: string) => {
      const value = configGet(key);
      if (value != null) {
        console.log(value);
      } else {
        console.error(chalk.yellow(`Config key "${key}" is not set.`));
        process.exit(1);
      }
    });

  cmd
    .command('set <key> <value>')
    .description('Set a config value (e.g., apiKey sk-xxx)')
    .action((key: string, value: string) => {
      configSet(key, value);
      console.log(chalk.green(`Set ${key} successfully.`));
    });

  cmd
    .command('list')
    .description('List all config values')
    .action(() => {
      const config = configList();
      if (Object.keys(config).length === 0) {
        console.log(chalk.yellow('No configuration set. Run `dmxapi config set apiKey <key>` to get started.'));
      } else {
        // 显示时脱敏 API Key，只保留前6位和后4位
        const display = { ...config };
        if (display.apiKey) {
          const key = display.apiKey;
          display.apiKey = key.slice(0, 6) + '...' + key.slice(-4);
        }
        console.log(JSON.stringify(display, null, 2));
      }
    });

  cmd
    .command('path')
    .description('Print config file location')
    .action(() => {
      console.log(configPath());
    });
}
