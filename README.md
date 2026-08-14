# 全媒体讲师 · Omnimedia Lecturer

一款开源的多语言微型课应用。它以中文为主要教学语言，通过“罗塞塔方法”同时呈现中文、英文、法文和德文的关键术语，并把概念放回词源、历史与当代语境中。

![Omnimedia Lecturer social card](./public/og.png)

## 已实现

- 四个独立学科书房：比较文学、全球经济、自然哲学与科学、艺术史
- 今日课程、随堂测验、布置作业与自由追问
- CN / EN / FR / DE 四语术语卡与词源说明
- 可插拔的实时讲师端点，支持 Google Search 等检索来源直达展示
- 学科绑定声线：Fenrir、Kore、Puck、Charon
- 可插拔原声服务，Web Speech API 设备语音自动兜底
- 不配置 API 也能完整使用的离线演示课程
- 桌面端书房布局与移动端学科导航

## 开始

需要 Node.js 22.13 或更高版本。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

打开 `http://localhost:3000`。不创建 `.env.local` 也可以使用全部内置课程、测验、作业和设备朗读。

## 可选：连接实时讲师

项目不绑定任何模型、SDK 或云平台。如果需要实时生成，可以连接一个自建或托管的 HTTP 端点：

```dotenv
LECTURER_TEXT_ENDPOINT=https://your-service.example/lecture
LECTURER_SPEECH_ENDPOINT=https://your-service.example/speech
LECTURER_PROVIDER_TOKEN=optional_bearer_token
```

文本端点会收到已组合的 `systemInstruction`、`prompt`、学科、模式与所需能力，返回：

```json
{
  "text": "Markdown 讲义",
  "sources": [{ "title": "来源标题", "url": "https://example.org" }],
  "grounded": true
}
```

语音端点会收到 `text`、`voice`、`direction` 与 `format`，直接返回 `audio/*` 响应。两个端点可以分别实现，也可以完全不配置。可选 Token 仅在服务端转发，不会发送到浏览器。

## 项目结构

```text
app/LecturerApp.tsx      书房界面、演示课程与交互
app/api/lecture/route.ts 文本生成与 Google Search grounding
app/api/tts/route.ts     厂商中性的语音服务适配器
lib/prompts.ts           核心系统指令与四学科上下文
app/globals.css          macOS 风格与响应式布局
```

核心提示词与界面内容分离，因此可以在不重写 UI 的情况下调整教学法、增加学科或更换模型。

## 安全与限制

- 不要提交 `.env.local` 或真实访问令牌。
- Google Search grounding 可以提高时效性与可验证性，但不代替人类编辑与专业审核。
- 没有原声服务或请求失败时，应用会使用设备自带语音。
- 公开部署时，请在托管平台的秘密变量中配置 Token，不要将它写入前端代码。

## 参与贡献

欢迎新的学科上下文、更精确的词源说明、无障碍改进与测试。提交前请运行：

```bash
pnpm build
pnpm test
```

## 许可证

[MIT](./LICENSE)
