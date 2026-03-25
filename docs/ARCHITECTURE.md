# dmxapi-cli 架构文档

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI 命令层                            │
│  commands/chat.ts  commands/image.ts  commands/config.ts    │
│  commands/models.ts                                         │
├─────────────────────────────────────────────────────────────┤
│                     抽象接口层 (interfaces/)                  │
│  ICapabilityHandler    IChatHandler    IImageHandler         │
│  IAsyncTaskHandler     IVideoHandler   IMusicHandler         │
├─────────────────────────────────────────────────────────────┤
│            Provider 实现层 (providers/ 按能力类型分目录)        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ chat/        │  │ image/       │  │ video/       │      │
│  │  openai-     │  │  openai-     │  │  sora.ts     │      │
│  │  compat.ts(*)│  │  compat.ts(*)│  │  vidu.ts     │      │
│  └──────────────┘  │  gemini.ts   │  └──────────────┘      │
│  ┌──────────────┐  └──────────────┘  ┌──────────────┐      │
│  │ tts/         │                    │ music/       │      │
│  │  openai-     │                    │  suno.ts     │      │
│  │  compat.ts   │                    │  minimax.ts  │      │
│  └──────────────┘                    └──────────────┘      │
│              ↑ 注册到 ProviderRegistry (registry.ts)         │
├─────────────────────────────────────────────────────────────┤
│                     核心基础设施 (core/)                      │
│  http-client.ts    config-manager.ts    errors.ts           │
│  logger.ts         output-formatter.ts  stream-renderer.ts  │
├─────────────────────────────────────────────────────────────┤
│                     类型定义 (types/)                         │
│  capability.ts  chat.ts  image.ts  video.ts  music.ts       │
│  tts.ts  task.ts  config.ts                                 │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
src/
├── index.ts                 # 程序入口，全局错误处理
├── cli.ts                   # Commander 程序构建，组装所有组件
│
├── types/                   # TypeScript 类型定义
│   ├── capability.ts        # Capability 枚举 + BaseRequest/BaseResponse
│   ├── chat.ts              # 对话相关类型
│   ├── image.ts             # 图片生成/编辑相关类型
│   ├── video.ts             # 视频生成相关类型（预留）
│   ├── music.ts             # 音乐生成相关类型（预留）
│   ├── tts.ts               # 语音合成相关类型（预留）
│   ├── task.ts              # 异步任务通用类型
│   ├── config.ts            # 配置 Schema 类型
│   └── index.ts             # 统一导出
│
├── interfaces/              # 抽象接口（handler 契约）
│   ├── capability-handler.ts # ICapabilityHandler + ExecutionContext
│   ├── chat-handler.ts      # IChatHandler（含 stream 方法）
│   ├── image-handler.ts     # IImageHandler
│   ├── async-task-handler.ts # IAsyncTaskHandler（submit + poll）
│   ├── video-handler.ts     # IVideoHandler
│   ├── music-handler.ts     # IMusicHandler
│   ├── tts-handler.ts       # ITtsHandler
│   └── index.ts             # 统一导出
│
├── providers/               # 具体 handler 实现（按能力类型分目录）
│   ├── registry.ts          # ProviderRegistry 注册中心
│   ├── chat/                # 对话能力的 handler 实现
│   │   └── openai-compat.ts # OpenAI 兼容格式（通用 fallback, priority=0）
│   ├── image/               # 图片生成能力的 handler 实现
│   │   ├── openai-compat.ts # OpenAI 兼容格式（通用 fallback, priority=0）
│   │   ├── gemini.ts        # Gemini 原生格式（generateContent, priority=10）
│   │   └── seedream.ts      # Seedream 即梦格式（/v1/responses, priority=10）
│   └── index.ts             # 统一注册所有 handler
│
├── commands/                # CLI 命令实现
│   ├── chat.ts              # dmxapi chat
│   ├── image.ts             # dmxapi image
│   ├── config.ts            # dmxapi config
│   ├── models.ts            # dmxapi models
│   └── index.ts             # 统一注册所有命令
│
├── core/                    # 核心基础设施
│   ├── http-client.ts       # HTTP 客户端（重试、超时、SSE 流）
│   ├── config-manager.ts    # 配置管理（多源合并）
│   ├── errors.ts            # 自定义错误层级
│   ├── logger.ts            # 分级日志系统
│   ├── output-formatter.ts  # 输出格式化（text/json）
│   └── stream-renderer.ts   # 流式输出渲染
│
└── utils/                   # 工具函数
    ├── model-resolver.ts    # 模型名称解析（默认值 + 别名 + registry）
    └── file-io.ts           # 文件下载/保存/图片读取
```

## 核心设计模式

### 1. 能力抽象（Capability + Handler 接口）

所有 AI 能力通过 `Capability` 枚举统一标识：

```typescript
enum Capability { Chat, Image, Video, Music, TTS }
```

每种能力有对应的 handler 接口：

- **同步能力**（`ICapabilityHandler`）：请求 → 等待 → 响应
  - `IChatHandler`：扩展了 `stream()` 方法支持流式输出
  - `IImageHandler`
  - `ITtsHandler`

- **异步任务能力**（`IAsyncTaskHandler`）：提交 → 轮询 → 获取结果
  - `IVideoHandler`
  - `IMusicHandler`

```
ICapabilityHandler<TReq, TRes>
├── execute(request, ctx) → Promise<TRes>
│
├── IChatHandler
│   └── stream(request, ctx) → AsyncIterable<ChatStreamChunk>
├── IImageHandler
└── ITtsHandler

IAsyncTaskHandler<TReq, TResult>
├── submit(request, ctx) → Promise<TaskSubmitResult>
└── poll(taskId, ctx)    → Promise<TaskStatusResult<TResult>>
    ├── IVideoHandler
    └── IMusicHandler
```

### 2. Provider Registry（注册中心）

`ProviderRegistry` 是处理器的调度核心，采用 **glob 模式匹配 + 优先级** 机制。

**注册：**

```typescript
// OpenAI 兼容 handler 作为通用 fallback（priority=0，匹配所有模型）
registry.register(Capability.Chat, new OpenAICompatChatHandler(), ['*'], 0);

// 特殊 handler 覆盖（priority=10，匹配特定模型）
registry.register(Capability.Music, new SunoMusicHandler(), ['suno*'], 10);
```

**解析：**

```typescript
// 用户调用 dmxapi chat -m claude-sonnet-4-20250514 "hello"
const handler = registry.resolve(Capability.Chat, 'claude-sonnet-4-20250514');
// → 返回 OpenAICompatChatHandler（因为 "claude-sonnet-4-20250514" 匹配 "*"）
```

解析流程：
1. 获取该 capability 下所有 handler entries（已按 priority 降序排列）
2. 逐个用 `micromatch.isMatch(model, patterns)` 匹配
3. 第一个匹配成功的即为结果
4. 无匹配则抛出 `UnknownModelError`

**为什么用 glob + 优先级？**

DMXAPI 平台大部分模型兼容 OpenAI 格式，所以用 `["*"]` 作为通用 fallback。
少数模型（如 Suno、Vidu）有特殊接口，注册更高优先级的专用 handler 即可覆盖。
这样新模型上线时无需修改代码，自动被通用 handler 处理。

### 3. 配置三级合并

```
内置默认值  ←  配置文件  ←  环境变量  ←  CLI 标志
(DEFAULTS)    (~/.dmxapi/    (DMXAPI_*)    (--api-key
               config.json)                 --model 等)
```

使用 `deepMerge` 做嵌套对象的递归合并，确保只覆盖明确指定的字段。
例如用户只设置了 `defaults.chatModel`，不会丢失 `defaults.imageModel` 的默认值。

### 4. ExecutionContext（依赖注入）

handler 不直接依赖全局状态，而是通过 `ExecutionContext` 接收运行时依赖：

```typescript
interface ExecutionContext {
  httpClient: HttpClient;  // HTTP 客户端
  config: ResolvedConfig;  // 完整配置
  logger: Logger;          // 日志实例
  signal?: AbortSignal;    // 取消信号
}
```

由命令层（commands/）负责创建 context 并传入 handler，便于测试和解耦。

## 数据流

以 `dmxapi chat -m gpt-5-mini "hello"` 为例：

```
1. [index.ts]    程序入口，解析命令行参数
        ↓
2. [cli.ts]      createProgram()，注册 provider 和命令
        ↓
3. [chat.ts]     chat 命令的 action 回调被触发
        ↓
4. [config-manager.ts]  resolveConfig() 合并配置
        ↓
5. [model-resolver.ts]  resolveModel() 解析模型
        ↓
6. [registry.ts]  registry.resolve(Chat, "gpt-5-mini")
                   → 返回 OpenAICompatChatHandler
        ↓
7. [chat/openai-compat.ts]  chatHandler.stream(request, ctx)
        ↓
8. [http-client.ts]  发送 POST /v1/chat/completions (stream=true)
                     → SSE 流式响应
        ↓
9. [stream-renderer.ts]  实时渲染到终端（打字机效果）
```

## 扩展指南

### 新增 Provider（为已有能力添加新的模型提供商）

**场景：** 添加 Gemini 专用的图片生成 handler。

Gemini 使用 Google 原生的 `generateContent` API（而非 OpenAI 的 `/v1/images/generations`），
需要专用 handler 处理请求/响应格式转换。

**步骤：**

1. 创建 handler 文件 `src/providers/image/gemini.ts`：

```typescript
import { Capability } from '../../types/index.js';
import type { ImageRequest, ImageResponse } from '../../types/index.js';
import type { IImageHandler, ExecutionContext } from '../../interfaces/index.js';
import type { ProviderRegistry } from '../registry.js';

export class GeminiImageHandler implements IImageHandler {
  readonly capability = Capability.Image;
  readonly supportedModels = ['gemini-*'];

  async execute(request: ImageRequest, ctx: ExecutionContext): Promise<ImageResponse> {
    // 使用 Gemini 原生的 generateContent 端点
    const body = {
      contents: [{ parts: [{ text: request.prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        // size → imageConfig.aspectRatio，quality → imageConfig.imageSize
      },
    };
    const path = `/v1beta/models/${request.model}:generateContent`;
    const data = await ctx.httpClient.request<any>(path, { body });

    // 从 candidates[0].content.parts 中提取图片（inlineData）和文本
    return { model: request.model, images: /* parsed from data */ };
  }
}

export function registerGeminiImage(registry: ProviderRegistry): void {
  // priority=10 高于 OpenAI 兼容的 priority=0
  registry.register(Capability.Image, new GeminiImageHandler(), ['gemini-*'], 10);
}
```

2. 在 `src/providers/index.ts` 注册：

```typescript
import { registerGeminiImage } from './image/gemini.js';

export function registerAllProviders(registry: ProviderRegistry): void {
  registerOpenAICompatChat(registry);
  registerOpenAICompatImage(registry);
  registerGeminiImage(registry);  // 新增
}
```

完成。当用户运行 `dmxapi image -m gemini-2.0-flash-exp-image-generation "..."` 时，
registry 会优先匹配 `GeminiImageHandler`（因为 `gemini-*` 在 priority=10 > 0）。

### 新增能力（添加全新的 AI 能力类型）

**场景：** 添加 text-to-3d（文生 3D 模型）能力。

**步骤：**

1. **定义类型** `src/types/threed.ts`：定义 ThreeDRequest、ThreeDResult
2. **定义接口** `src/interfaces/threed-handler.ts`：定义 IThreeDHandler
3. **更新枚举** 在 `Capability` 中添加 `ThreeD = 'threed'`
4. **实现 handler** `src/providers/threed/openai-compat.ts`（或其他提供商）
5. **注册 handler** 在 `src/providers/index.ts` 中调用注册函数
6. **添加命令** `src/commands/threed.ts`，注册到 `src/commands/index.ts`

### extra 透传机制

所有请求类型都包含 `extra?: Record<string, unknown>` 字段，
通过 CLI 的 `-p key=value`（可重复）传递提供商特有参数。

handler 在构造请求体时使用 `Object.assign(body, request.extra)` 将 extra 合并到 API 请求中。
这保证了即使 CLI 未定义某个特殊参数，用户也可以传递给 API。

```bash
# 传递 OpenAI 特有的 presence_penalty 参数
dmxapi chat "hello" -p presence_penalty=0.5

# 传递 JSON 对象
dmxapi chat "hello" -p response_format='{"type":"json_object"}'
```
