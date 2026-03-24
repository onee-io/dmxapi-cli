/**
 * @module commands/models
 * @description models 命令 —— 列出可用模型和提供商
 *
 * 用法：dmxapi models [--capability chat|image|video|music|tts]
 *
 * 显示所有在 ProviderRegistry 中注册的模型模式和对应的处理器。
 * 支持按能力类型过滤，支持 json 输出格式。
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Capability } from '../types/index.js';
import { registry } from '../providers/registry.js';

/** 注册 models 命令到 Commander 程序 */
export function registerModelsCommand(program: Command): void {
  program
    .command('models')
    .description('List available models and providers')
    .option('--capability <type>', 'Filter by capability: chat | image | video | music | tts')
    .action((opts) => {
      const globalOpts = program.opts();
      const cap = opts.capability as Capability | undefined;

      // 验证能力类型是否有效
      if (cap && !Object.values(Capability).includes(cap)) {
        console.error(
          chalk.red(`Unknown capability: ${cap}. Choose from: ${Object.values(Capability).join(', ')}`),
        );
        process.exit(1);
      }

      const models = registry.listModels(cap);

      if (models.length === 0) {
        console.log(chalk.yellow('No models registered.'));
        return;
      }

      // json 格式直接输出
      if (globalOpts.output === 'json') {
        console.log(JSON.stringify(models, null, 2));
        return;
      }

      // text 格式按能力类型分组展示
      const grouped = new Map<string, typeof models>();
      for (const m of models) {
        const group = grouped.get(m.capability) ?? [];
        group.push(m);
        grouped.set(m.capability, group);
      }

      for (const [capability, entries] of grouped) {
        console.log(chalk.bold.underline(`\n${capability.toUpperCase()}`));
        for (const entry of entries) {
          console.log(`  ${chalk.cyan(entry.patterns.join(', '))} ${chalk.gray(`(${entry.handlerName})`)}`);
        }
      }
      console.log();
    });
}
