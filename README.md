<div align="center">

<img src="docs/assets/dmxapi_logo.jpeg" alt="DMXAPI" width="200">

### DMXAPI CLI 统一命令行工具 —— 一个 Key 调用全球 500+ AI 模型。

[DMXAPI](https://www.dmxapi.cn/) 是大模型 API 聚合平台，支持 OpenAI、Claude、Gemini、千问等主流模型。`dmxapi-cli` 对文生文、文生图、文生视频、文生音乐等能力做统一的 CLI 封装，屏蔽底层提供商差异，方便开发者和智能体调用。

</div>

## ❤️赞助商

感谢 DMXAPI（大模型API）赞助了本项目！ DMXAPI，一个 Key 用全球大模型。

为 200 多家企业用户提供全球大模型 API 服务。· 充值即开票 · 当天开票 · 并发不限制 · 1元起充 · 7x24 在线技术辅导，GPT/Claude/Gemini 全部 6.8 折，国内模型 5~8 折，Claude Code 专属模型 3.4 折进行中！<a href="https://www.dmxapi.cn/register?aff=MATS">点击这里注册</a></td>

## 功能特性

- **文本对话** (`chat`) —— 支持流式输出、system 消息、图片附件（视觉模型）
- **图片生成/编辑** (`image`) —— 支持比例/分辨率配置、图片编辑、多图融合、自动下载保存
- **配置管理** (`config`) —— 多级配置优先级（CLI > 环境变量 > 配置文件 > 默认值）
- **模型查询** (`models`) —— 列出所有可用模型和提供商
- **易扩展** —— 新增提供商只需 2 步，新增能力只需 5 步
- **智能体友好** —— 支持 JSON 输出、管道输入、详细的参数说明

> **规划中**：文生视频 (`video`)、文生音乐 (`music`)、语音合成 (`tts`)

## Agent Skills

项目内置了符合 [Agent Skills](https://agentskills.io/) 标准的技能定义，可供 AI Agent 直接调用。

| 技能 | 说明 |
|------|------|
| [`dmxapi-image-generation`](skills/dmxapi-image-generation/SKILL.md) | 图片生成/编辑（文生图、图片编辑、多图融合、联网搜索增强） |

通过 [🦞 OpenClaw](https://openclaw.ai/) 安装技能：

```bash
clawhub install dmxapi-image-generation
```

## 安装

```bash
npm install -g dmxapi-cli
```

要求 Node.js >= 20。

## 快速开始

### 1. 配置 API Key

从 [DMXAPI 控制台](https://www.dmxapi.cn/token) 获取 API Key，然后：

```bash
# 方式一：写入配置文件（推荐）
dmxapi config set apiKey sk-your-api-key

# 方式二：环境变量
export DMXAPI_API_KEY=sk-your-api-key

# 方式三：命令行参数（临时使用）
dmxapi chat --api-key sk-your-api-key "hello"
```

### 2. 开始使用

```bash
# 文本对话
dmxapi chat "用一句话介绍你自己"

# 指定模型
dmxapi chat -m claude-sonnet-4-20250514 "什么是量子计算？"

# 带 system 消息
dmxapi chat -s "你是一个翻译助手" "Translate to English: 今天天气真好"

# 图片生成并保存到本地
dmxapi image "一只在月球上骑自行车的猫" -o ./output
```

## 命令详解

### `dmxapi chat [prompt]`

文本对话（文生文），支持流式输出。

```
选项：
  -m, --model <model>         模型名称（默认：gpt-5-mini）
  -s, --system <message>      系统消息
  -t, --temperature <number>  采样温度 0-2（越高越随机）
  --max-tokens <number>       最大生成 token 数
  --top-p <number>            核采样参数
  --stream                    启用流式输出（终端默认开启）
  --no-stream                 禁用流式输出
  -f, --file <path>           从文件读取 prompt
  --image <url>               附加图片 URL（视觉模型）
  -p, --param <key=value>     额外 API 参数（可重复使用）
```

**使用示例：**

```bash
# 从文件读取 prompt
dmxapi chat -f prompt.txt

# 管道输入
echo "解释这段代码" | dmxapi chat

# 图片理解（视觉模型）
dmxapi chat -m gpt-4o "描述这张图片的内容" --image https://example.com/photo.jpg

# 传递额外参数
dmxapi chat "hello" -p presence_penalty=0.5 -p frequency_penalty=0.3

# JSON 格式输出（适合程序化处理）
dmxapi --output json chat "hello" | jq '.content'
```

### `dmxapi image <prompt>`

图片生成/编辑（文生图、图片编辑、多图融合）。

```
选项：
  -m, --model <model>         模型名称（默认：gemini-3.1-flash-image-preview）
  --size <ratio>              图片比例（如 1:1, 16:9, 9:16）
  --quality <level>           分辨率：1K | 2K | 4K（默认 1K）
  -n, --count <number>        生成数量
  --image <path>              输入图片（可重复多次实现多图融合）
  --web-search                启用联网搜索增强（Gemini/Seedream）
  -o, --save <dir>            保存图片到目录
  -p, --param <key=value>     额外 API 参数（可重复使用）
```

**使用示例：**

```bash
# 基本生成
dmxapi image "日落时分的未来城市" -o ./output

# 指定比例和质量
dmxapi image "一只猫的肖像画" --size 9:16 --quality 2K -o ./output

# 图片编辑：在已有图片上修改
dmxapi image "把背景改成星空" --image ./photo.png -o ./output

# 多图融合
dmxapi image "将这两张图片融合成一幅画" --image ./a.png --image ./b.png -o ./output

# 联网搜索增强
dmxapi image "最新款 iPhone 产品图" --web-search -o ./output
```

### `dmxapi config`

配置管理。

```bash
# 设置配置项
dmxapi config set apiKey sk-xxx
dmxapi config set defaults.chatModel claude-sonnet-4-20250514
dmxapi config set http.timeout 60000

# 读取配置项
dmxapi config get apiKey
dmxapi config get defaults.chatModel

# 列出所有配置
dmxapi config list

# 查看配置文件路径
dmxapi config path
```

### `dmxapi models`

列出所有可用模型和提供商。

```bash
# 列出所有模型
dmxapi models

# 按能力类型过滤
dmxapi models --capability chat
dmxapi models --capability image

# JSON 格式输出
dmxapi --output json models
```

### 全局选项

```
--api-key <key>       API 密钥（覆盖环境变量和配置文件）
--base-url <url>      API 基础 URL（覆盖环境变量和配置文件）
--output <format>     输出格式：text | json（默认 text）
--output-file <path>  输出保存到文件
--verbose             启用调试日志
--no-color            禁用彩色输出
--timeout <ms>        请求超时（毫秒）
```

## 配置说明

配置文件位于 `~/.dmxapi/config.json`，支持以下配置项：

```json
{
  "apiKey": "sk-your-api-key",
  "baseUrl": "https://www.dmxapi.cn",
  "defaults": {
    "chatModel": "gpt-5-mini",
    "imageModel": "gemini-3.1-flash-image-preview",
    "videoModel": "sora-2",
    "musicModel": "suno",
    "ttsModel": "tts-1",
    "ttsVoice": "alloy"
  },
  "http": {
    "timeout": 300000,
    "retries": 1
  },
  "output": {
    "format": "text",
    "saveDir": "."
  },
  "modelAliases": {
    "fast": "gpt-5-mini",
    "smart": "claude-sonnet-4-20250514"
  }
}
```

### 配置优先级

从高到低：

1. **CLI 命令行标志** (`--api-key`, `--model` 等)
2. **环境变量** (`DMXAPI_API_KEY`, `DMXAPI_BASE_URL` 等)
3. **配置文件** (`~/.dmxapi/config.json`)
4. **内置默认值**

### 环境变量

| 变量 | 说明 |
|------|------|
| `DMXAPI_API_KEY` | API 密钥 |
| `DMXAPI_BASE_URL` | API 基础 URL |
| `DMXAPI_DEFAULT_CHAT_MODEL` | 默认对话模型 |
| `DMXAPI_DEFAULT_IMAGE_MODEL` | 默认图片模型 |
| `DMXAPI_TIMEOUT` | 请求超时（毫秒） |

## 扩展开发

### 新增提供商（已有能力）

只需 2 步：

1. 在 `src/providers/` 下创建 handler 文件，实现对应接口
2. 在 `src/providers/index.ts` 中注册

```typescript
// src/providers/image/gemini.ts — 已实现
// Gemini 使用 generateContent API，与 OpenAI 格式不同
export class GeminiImageHandler implements IImageHandler {
  readonly capability = Capability.Image;
  readonly supportedModels = ['gemini-*'];

  async execute(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    const path = `/v1beta/models/${request.model}:generateContent`;
    const body = {
      contents: [{ parts: [{ text: request.prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    };
    const data = await ctx.httpClient.request<any>(path, { body });
    // 从 candidates[0].content.parts 提取 inlineData (base64 图片)
    return { model: request.model, images: /* ... */ };
  }
}

export function registerGeminiImage(registry: ProviderRegistry): void {
  registry.register(Capability.Image, new GeminiImageHandler(), ['gemini-*'], 10);
}
```

### 新增能力

需要 5 步：

1. `src/types/` —— 定义请求/响应类型
2. `src/interfaces/` —— 定义 handler 接口
3. `src/providers/` —— 实现 handler
4. `src/providers/index.ts` —— 注册 handler
5. `src/commands/` —— 添加 CLI 命令

详细架构说明参见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化自动构建）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 本地试用
node dist/index.js --help
```

## License

MIT
