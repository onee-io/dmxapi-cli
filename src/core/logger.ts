/**
 * @module core/logger
 * @description 分级日志系统
 *
 * 提供 debug/info/warn/error 四个级别的日志输出，带颜色标记。
 * 日志输出到 stderr（不干扰 stdout 的正常数据输出），
 * 这样 `dmxapi chat "hello" | jq` 这样的管道操作不受影响。
 *
 * 通过 --verbose 标志可将日志级别设置为 debug。
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 日志级别优先级映射（数值越小越详细） */
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** 分级日志器 */
export class Logger {
  private level: number;

  constructor(level: LogLevel = 'info') {
    this.level = LEVEL_ORDER[level];
  }

  debug(...args: unknown[]): void {
    if (this.level <= LEVEL_ORDER.debug) {
      console.error(chalk.gray('[DEBUG]'), ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.level <= LEVEL_ORDER.info) {
      console.error(chalk.blue('[INFO]'), ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.level <= LEVEL_ORDER.warn) {
      console.error(chalk.yellow('[WARN]'), ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.level <= LEVEL_ORDER.error) {
      console.error(chalk.red('[ERROR]'), ...args);
    }
  }
}

/** 全局日志实例，默认 info 级别 */
export const logger = new Logger();

/** 动态修改全局日志级别 */
export function setLogLevel(level: LogLevel): void {
  (logger as any).level = LEVEL_ORDER[level];
}
