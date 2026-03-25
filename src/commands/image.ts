/**
 * @module commands/image
 * @description image 命令 —— 图片生成（文生图）
 *
 * 用法：dmxapi image [options] <prompt>
 *
 * 支持通过 -o 指定保存目录，自动下载生成的图片到本地。
 * 不指定 -o 时仅输出图片 URL。
 */

import { Command } from 'commander';
import { join } from 'node:path';
import chalk from 'chalk';
import { Capability } from '../types/index.js';
import { resolveConfig, requireApiKey } from '../core/config-manager.js';
import { HttpClient } from '../core/http-client.js';
import { logger, setLogLevel } from '../core/logger.js';
import { OutputFormatter } from '../core/output-formatter.js';
import { registry } from '../providers/registry.js';
import { resolveModel } from '../utils/model-resolver.js';
import { downloadFile, saveBase64, generateFilename, ensureDir, readImageAsBase64 } from '../utils/file-io.js';
import type { IImageHandler } from '../interfaces/index.js';
import type { ImageResponse } from '../types/index.js';

/** 解析 -p key=value 格式的额外参数 */
function parseExtraParams(params: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const p of params) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    const key = p.slice(0, eq);
    const val = p.slice(eq + 1);
    try {
      result[key] = JSON.parse(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

/** 将生成的图片保存到指定目录 */
async function saveImages(response: ImageResponse, saveDir: string): Promise<string[]> {
  ensureDir(saveDir);
  const savedPaths: string[] = [];

  for (let i = 0; i < response.images.length; i++) {
    const img = response.images[i];
    // 多张图片时在文件名后追加序号
    const filename = generateFilename('image', 'png', response.images.length > 1 ? i : undefined);
    const filepath = join(saveDir, filename);

    if (img.b64Json) {
      saveBase64(img.b64Json, filepath);
      savedPaths.push(filepath);
    } else if (img.url) {
      await downloadFile(img.url, filepath);
      savedPaths.push(filepath);
    }
  }

  return savedPaths;
}

/** 注册 image 命令到 Commander 程序 */
export function registerImageCommand(program: Command): void {
  program
    .command('image')
    .description('Generate images from text prompts')
    .argument('<prompt>', 'Image description')
    .option('-m, --model <model>', 'Model to use')
    .option('--size <ratio>', 'Aspect ratio (e.g., 1:1, 16:9, 9:16)')
    .option('--quality <level>', 'Resolution: 1K | 2K | 4K (default: 1K)')
    .option('-n, --count <number>', 'Number of images', parseInt)
    .option('--image <path>', 'Input image for editing')
    .option('--web-search', 'Enable web search for image generation')
    .option('-o, --save <dir>', 'Save images to directory')
    .option('-p, --param <key=value...>', 'Extra API parameters', (val, prev: string[]) => {
      prev.push(val);
      return prev;
    }, [])
    .action(async (prompt: string, opts) => {
      const globalOpts = program.opts();
      if (globalOpts.verbose) setLogLevel('debug');

      const config = resolveConfig({
        apiKey: globalOpts.apiKey,
        baseUrl: globalOpts.baseUrl,
        http: globalOpts.timeout ? { timeout: parseInt(globalOpts.timeout, 10) } : undefined,
        output: { format: globalOpts.output as 'text' | 'json' },
      });
      requireApiKey(config);

      const { handler, model } = resolveModel(registry, Capability.Image, opts.model, config);
      const imageHandler = handler as IImageHandler;

      const httpClient = new HttpClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        timeout: config.http.timeout,
        retries: config.http.retries,
        logger,
      });

      const ctx = { httpClient, config, logger };
      const extra = opts.param?.length ? parseExtraParams(opts.param) : undefined;

      // 读取输入图片（用于图片编辑）
      const image = opts.image ? readImageAsBase64(opts.image) : undefined;

      logger.info(`Generating image with ${model}...`);
      const response = await imageHandler.execute(
        {
          model,
          prompt,
          image,
          size: opts.size,
          quality: opts.quality,
          n: opts.count,
          webSearch: opts.webSearch,
          extra,
        },
        ctx,
      );

      // 保存图片到本地：指定了 -o 则用指定目录，否则用当前工作目录
      const saveDir = opts.save ?? '.';
      const savedPaths = await saveImages(response, saveDir);
      for (const p of savedPaths) {
        console.log(chalk.green(`Saved: ${p}`));
      }

      const formatter = new OutputFormatter(config.output.format);
      formatter.printImages(response);
    });
}
