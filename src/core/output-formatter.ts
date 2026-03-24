/**
 * @module core/output-formatter
 * @description 输出格式化器
 *
 * 根据用户选择的输出格式（text 或 json），将响应数据格式化输出到终端。
 * - text 模式：人类可读的彩色输出
 * - json 模式：结构化 JSON，适合管道操作和程序化解析
 */

import chalk from 'chalk';
import type { ChatResponse, ImageResponse, ImageResult } from '../types/index.js';

export class OutputFormatter {
  constructor(
    private format: 'text' | 'json' = 'text',
    private outputFile?: string,
  ) {}

  /** 输出对话响应 */
  printChat(response: ChatResponse): void {
    if (this.format === 'json') {
      this.printJson(response);
    } else {
      process.stdout.write(response.content + '\n');
    }
  }

  /** 输出图片生成响应（text 模式显示 URL，json 模式输出完整结构） */
  printImages(response: ImageResponse): void {
    if (this.format === 'json') {
      this.printJson(response);
    } else {
      response.images.forEach((img: ImageResult, i: number) => {
        if (response.images.length > 1) {
          console.log(chalk.bold(`Image ${i + 1}:`));
        }
        if (img.url) console.log(img.url);
        if (img.revisedPrompt) {
          console.log(chalk.gray(`Revised prompt: ${img.revisedPrompt}`));
        }
      });
    }
  }

  /** 输出格式化的 JSON */
  printJson(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
  }
}
