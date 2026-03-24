/**
 * @module commands/chat
 * @description chat 命令 —— 文本对话（文生文）
 *
 * 用法：dmxapi chat [options] [prompt]
 *
 * 支持三种 prompt 输入方式：
 * 1. 命令行参数：dmxapi chat "hello"
 * 2. 文件读取：dmxapi chat -f prompt.txt
 * 3. 管道输入：echo "hello" | dmxapi chat
 *
 * 流式输出策略：
 * - TTY 终端：默认流式（打字机效果）
 * - 管道输出：默认非流式（完整输出一次性写入）
 * - 可通过 --stream / --no-stream 强制覆盖
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { Capability } from '../types/index.js';
import type { ChatMessage, ChatContentPart } from '../types/index.js';
import { resolveConfig, requireApiKey } from '../core/config-manager.js';
import { HttpClient } from '../core/http-client.js';
import { logger, setLogLevel } from '../core/logger.js';
import { OutputFormatter } from '../core/output-formatter.js';
import { StreamRenderer } from '../core/stream-renderer.js';
import { registry } from '../providers/registry.js';
import { resolveModel } from '../utils/model-resolver.js';
import type { IChatHandler } from '../interfaces/index.js';

/**
 * 解析 -p key=value 格式的额外参数
 * 值会尝试 JSON 解析（支持数字、布尔值、对象），失败则作为字符串
 */
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

/** 从 stdin 读取输入（仅在非 TTY 模式下，即管道输入时生效） */
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8').trim();
}

/** 注册 chat 命令到 Commander 程序 */
export function registerChatCommand(program: Command): void {
  program
    .command('chat')
    .description('Chat with AI models (text generation)')
    .argument('[prompt]', 'Chat prompt (or pipe from stdin)')
    .option('-m, --model <model>', 'Model to use')
    .option('-s, --system <message>', 'System message')
    .option('-t, --temperature <number>', 'Temperature (0-2)', parseFloat)
    .option('--max-tokens <number>', 'Maximum tokens to generate', parseInt)
    .option('--top-p <number>', 'Top-p sampling', parseFloat)
    .option('--stream', 'Enable streaming output (default for TTY)')
    .option('--no-stream', 'Disable streaming')
    .option('-f, --file <path>', 'Read prompt from file')
    .option('--image <url>', 'Attach image URL for vision models')
    .option('-p, --param <key=value...>', 'Extra API parameters', (val, prev: string[]) => {
      prev.push(val);
      return prev;
    }, [])
    .action(async (promptArg: string | undefined, opts) => {
      const globalOpts = program.opts();
      if (globalOpts.verbose) setLogLevel('debug');

      // 合并全局选项到配置
      const config = resolveConfig({
        apiKey: globalOpts.apiKey,
        baseUrl: globalOpts.baseUrl,
        http: globalOpts.timeout ? { timeout: parseInt(globalOpts.timeout, 10) } : undefined,
        output: { format: globalOpts.output as 'text' | 'json' },
      });
      requireApiKey(config);

      // 按优先级确定 prompt 来源：参数 > 文件 > stdin
      let prompt = promptArg;
      if (!prompt && opts.file) {
        prompt = readFileSync(opts.file, 'utf-8').trim();
      }
      if (!prompt) {
        prompt = await readStdin();
      }
      if (!prompt) {
        console.error('Error: prompt is required. Provide as argument, --file, or pipe from stdin.');
        process.exit(1);
      }

      // 构建消息列表
      const messages: ChatMessage[] = [];
      if (opts.system) {
        messages.push({ role: 'system', content: opts.system });
      }

      // 如果附带了图片，构造多模态消息（用于视觉模型）
      if (opts.image) {
        const content: ChatContentPart[] = [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: opts.image } },
        ];
        messages.push({ role: 'user', content });
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      // 通过 registry 解析模型对应的 handler
      const { handler, model } = resolveModel(registry, Capability.Chat, opts.model, config);
      const chatHandler = handler as IChatHandler;

      const httpClient = new HttpClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        timeout: config.http.timeout,
        retries: config.http.retries,
        logger,
      });

      const ctx = { httpClient, config, logger };
      const extra = opts.param?.length ? parseExtraParams(opts.param) : undefined;

      // 流式判断：显式指定 > TTY 检测（终端默认流式，管道默认非流式）
      const shouldStream = opts.stream !== false && (opts.stream === true || process.stdout.isTTY);

      if (shouldStream) {
        const renderer = new StreamRenderer();
        const stream = chatHandler.stream(
          { model, messages, temperature: opts.temperature, maxTokens: opts.maxTokens, topP: opts.topP, extra },
          ctx,
        );

        if (config.output.format === 'json') {
          // json 模式：先收集完整内容，再结构化输出
          const content = await renderer.renderJson(stream);
          const formatter = new OutputFormatter('json');
          formatter.printChat({ model, content, finishReason: 'stop' });
        } else {
          // text 模式：实时渲染到终端
          await renderer.render(stream);
        }
      } else {
        // 非流式：等待完整响应后一次性输出
        const response = await chatHandler.execute(
          { model, messages, temperature: opts.temperature, maxTokens: opts.maxTokens, topP: opts.topP, extra },
          ctx,
        );
        const formatter = new OutputFormatter(config.output.format);
        formatter.printChat(response);
      }
    });
}
