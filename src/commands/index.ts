/**
 * @module commands
 * @description CLI 命令统一注册入口
 *
 * 所有 CLI 命令在此集中注册到 Commander 程序。
 * 新增命令时，只需在此文件中 import 并调用注册函数即可。
 */

import type { Command } from 'commander';
import { registerChatCommand } from './chat.js';
import { registerConfigCommand } from './config.js';
import { registerImageCommand } from './image.js';
import { registerModelsCommand } from './models.js';

/** 注册所有 CLI 命令 */
export function registerCommands(program: Command): void {
  registerChatCommand(program);
  registerImageCommand(program);
  registerConfigCommand(program);
  registerModelsCommand(program);
}
