/**
 * @module core/stream-renderer
 * @description 流式输出渲染器
 *
 * 将 chat 流式响应实时渲染到终端，实现打字机效果。
 * 提供两种模式：
 * - render()：直接写入 stdout（text 模式）
 * - renderJson()：静默收集全部内容（json 模式，不实时输出）
 */

import type { ChatStreamChunk } from '../types/index.js';

export class StreamRenderer {
  /** 实时渲染流式内容到终端（打字机效果） */
  async render(stream: AsyncIterable<ChatStreamChunk>): Promise<string> {
    let fullContent = '';
    for await (const chunk of stream) {
      process.stdout.write(chunk.content);
      fullContent += chunk.content;
    }
    process.stdout.write('\n');
    return fullContent;
  }

  /** 静默收集流式内容（不实时输出，用于 json 格式） */
  async renderJson(stream: AsyncIterable<ChatStreamChunk>): Promise<string> {
    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk.content;
    }
    return fullContent;
  }
}
