/**
 * @module index
 * @description 程序入口
 *
 * 创建 CLI 程序并解析命令行参数。
 * 全局错误处理：已知错误输出友好提示，未知错误输出完整信息。
 */

// 在所有其他模块之前加载 .env 文件，确保环境变量在配置解析时可用
import 'dotenv/config';

import { createProgram } from './cli.js';
import { DmxapiError, AuthenticationError } from './core/errors.js';
import { logger } from './core/logger.js';

const program = createProgram();

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof DmxapiError) {
    logger.error(err.message);
    // API 错误时输出响应体中的详细信息
    if ('responseBody' in err && err.responseBody) {
      const body = err.responseBody;
      const detail = typeof body === 'object' && body !== null && 'error' in body
        ? (body as any).error?.message ?? JSON.stringify(body)
        : String(body);
      logger.error('Detail:', detail);
    }
    if (err instanceof AuthenticationError) {
      logger.info('Hint: run `dmxapi config init` to set up your API key.');
    }
    process.exit(1);
  }
  logger.error('Unexpected error:', err);
  process.exit(1);
});
