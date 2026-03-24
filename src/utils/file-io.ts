/**
 * @module utils/file-io
 * @description 文件 I/O 工具函数
 *
 * 提供文件下载、Base64 保存、文件名生成等通用文件操作。
 * 主要用于图片/音视频等生成结果的本地保存。
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * 从 URL 下载文件并保存到本地
 * @param url 下载地址
 * @param outputPath 本地保存路径（自动创建父目录）
 */
export async function downloadFile(url: string, outputPath: string): Promise<void> {
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, buffer);
}

/**
 * 将 Base64 编码的数据保存为文件
 * @param data Base64 编码字符串
 * @param outputPath 本地保存路径（自动创建父目录）
 */
export function saveBase64(data: string, outputPath: string): void {
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(outputPath, Buffer.from(data, 'base64'));
}

/**
 * 生成带时间戳的文件名
 * @param prefix 文件名前缀，如 "image"
 * @param ext 文件扩展名，如 "png"
 * @param index 序号（多文件时使用，从 0 开始，显示为 1 开始）
 * @returns 如 "image-2026-03-25T10-30-00-1.png"
 */
export function generateFilename(prefix: string, ext: string, index?: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const suffix = index != null ? `-${index + 1}` : '';
  return `${prefix}-${timestamp}${suffix}.${ext}`;
}

/** 确保目录存在，不存在则递归创建 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
