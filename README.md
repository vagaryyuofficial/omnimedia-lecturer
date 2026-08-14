# 全媒体领域学院 · Omnimedia Lecturer

一款开源的多模态、多语种学术学习平台。它采用 CLIL（Content and Language Integrated Learning，内容与语言整合学习）方法：用中文建立复杂概念，再通过英语、法语与德语术语、词源、语法和原声发音校准知识边界。

[![MIT License](https://img.shields.io/badge/license-MIT-4f6f64.svg)](./LICENSE)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-5b7f67.svg)](https://nodejs.org/)

在线体验：[omnimedia-lecturer.vagarywei.chatgpt.site](https://omnimedia-lecturer.vagarywei.chatgpt.site/)

![Omnimedia Lecturer social card](./public/og.png)

## 已实现

- Q1–Q8 八大学科学术战役：文学、经济学、心理学、商务交流、生活用语、艺术美学、哲学、科学技术
- 每个学科独立的系统上下文，以及 L1 基础、L2 核心、L3 高阶三级课程树
- 概念定义、案例分析、学术精读和自由追问四种学习入口
- 中文主讲，EN / FR / DE 三语术语卡、词源与语法拆解
- `{{术语|LANG}}` 行内术语与 `[[LANG: ...]]` 多语卡片 DSL 的前端解析
- 可点击术语、单词和整句发音，以及定义、词源、语法、语义和例句深度弹窗
- 多模型语音中心：Gemini Speech、Qwen3 TTS、Fish Audio S2 Pro 与 OpenAI Speech 可独立连接和即时切换
- 原始 PCM 与浏览器原生音频解码、单例播放、重复点击停止和 24 项 LRU 内存缓存
- 四语独立声线策略；界面始终显示当前实际播放引擎与声线
- 设备端自动等待声库加载、按音质评分选声、长句分段，并在中文段落内切换外语术语发音
- 学术视觉画廊、来源卡片与可插拔的检索 grounding 数据
- iPad / macOS 风格双栏备忘录，支持搜索、时间排序和 LocalStorage 自动保存
- 不配置任何外部服务也可使用的八门内置示范课程与设备语音兜底
- Apple 风格桌面布局和移动端响应式交互

## 开始

需要 Node.js 22.13 或更高版本。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

打开 `http://localhost:3000`。不创建 `.env.local` 也可以使用内置课程、课程树、视觉资料、术语报告、备忘录和设备朗读。

## 可选：连接实时内容与服务端语音

三个通用 HTTP 端点均可独立实现，也可以为自有部署配置服务端 OpenAI Speech：

```dotenv
LECTURER_TEXT_ENDPOINT=https://your-service.example/lecture
LECTURER_SPEECH_ENDPOINT=https://your-service.example/speech
LECTURER_TERM_ENDPOINT=https://your-service.example/term
LECTURER_PROVIDER_TOKEN=optional_bearer_token

# 或直接使用内置的 OpenAI Speech 适配器
OPENAI_API_KEY=your_server_side_key
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

### 讲师端点

讲师端点会收到已经组合好的 `systemInstruction`、`prompt`、学科、模式和所需能力。响应示例：

```json
{
  "text": "## 概念界定\n正文中的 {{term|EN}} ...\n[[EN: Academic sentence || term : 中文义 : grammar and etymology]]",
  "sources": [{ "title": "来源标题", "url": "https://example.org" }],
  "visuals": [
    {
      "src": "https://example.org/image.jpg",
      "title": "图像标题",
      "caption": "图像与课程的关系",
      "sourceUrl": "https://example.org/source",
      "sourceLabel": "Institution · Licence"
    }
  ],
  "grounded": true
}
```

### 多模型语音中心

右侧“真实多语声线”面板提供“管理”入口。使用者可以连接自己的服务账户并即时试听：

| 服务 | 适用方向 | 额外设置 |
| --- | --- | --- |
| Gemini Speech | 表达型朗读与四语独立声线 | 可选择 Gemini TTS 模型 |
| Qwen3 TTS | 中文与英、法、德多语朗读 | 选择中国站或国际站 Key |
| Fish Audio S2 Pro | 拟人韵律与角色化声音 | 可选 Voice Reference ID |
| OpenAI Speech | 指令式朗读与通用高清 TTS | 可选择 Speech 模型 |

API Key 只保存在当前标签页的 `sessionStorage`，关闭标签页即清除；它随同源 HTTPS 请求发送到 `/api/tts`，由服务端转发给所选供应商，不会写入仓库、笔记、LocalStorage 或服务端持久化存储。请只在自己信任的部署中输入 Key，并避免朗读敏感信息。

项目不会把 DeepSeek 或 Kimi 冒充成语音引擎：它们可以承担内容生成，但官方 API 没有直接 TTS。CosyVoice、F5-TTS 等开放权重仍需要本地或云端部署；本项目默认不部署模型，因此只连接可直接调用的托管语音 API。

若配置 `LECTURER_SPEECH_ENDPOINT`，语音端点会收到 `text`、`language`、实际声线、角色、朗读指令、采样率和编码信息。它可返回原始 PCM，也可返回浏览器能够解码的 `audio/*` 文件。

若未配置通用端点但配置了服务端 `OPENAI_API_KEY`，服务端会直接调用 OpenAI Speech API，密钥不会发送到浏览器。完全不配置云端语音时，应用会诚实标示“设备增强声线”，并选择当前设备中匹配语言的最佳本地声线。

### 术语端点

术语端点会收到术语、语言、学科和目标结构，返回 `definition`、`etymology`、`grammar`、`nuance`、`example` 与 `translation` 六个字符串字段。没有配置或请求失败时，界面会继续显示内置报告。

可选 Token 只由服务端转发，不会发送到浏览器。

## 教学 DSL

行内术语：

```text
{{Es|DE}}、{{Id|EN}}、{{ça|FR}}
```

多语卡片：

```text
[[DE: Es, Ich und Über-Ich || Es : 本我 : neuter pronoun used as noun ;; Ich : 自我 : nominalized pronoun]]
```

`LANG` 只接受 `CN`、`EN`、`FR` 或 `DE`。实时讲师应以中文为正文主体，并至少提供 EN、FR、DE 三张卡片。

## 项目结构

```text
app/LecturerApp.tsx       学院界面、课程树、弹窗、备忘录与交互
app/api/lecture/route.ts  厂商中性的实时讲师与视觉 grounding 适配器
app/api/tts/route.ts      Gemini / Qwen / Fish Audio / OpenAI 语音适配器
app/api/term/route.ts     深度术语报告适配器
lib/academy-data.ts       八大学科、三级课程、内置讲义与视觉资料
lib/prompts.ts            CLIL 核心系统指令和八学科上下文
lib/dsl.ts                行内术语与多语卡片 DSL 解析器
lib/audio-engine.ts       多服务会话、单例播放、音频解码、LRU 缓存与设备兜底
app/globals.css           Apple / macOS 风格设计系统与响应式布局
```

核心提示词、课程数据和界面解析相互分离，便于扩充学科、替换模型或接入自托管服务。

## 视觉资料

内置示范图来自 Wikimedia Commons 的公共领域资料，并保留原始来源链接：Sigmund Freud、ENIAC、Monet Water Lilies、1900 Michelin Guide、The School of Athens 与 Adam Smith。部署自己的公开版本时，请继续核对每一项素材页上的作者、地域和许可状态。

## 安全与限制

- 不要提交 `.env.local` 或真实访问令牌。
- 浏览器会话中的自带 Key 由使用者自行管理；公开部署者不应记录代理请求头或请求正文。
- 搜索 grounding 能提高时效性与可验证性，但不能代替人工编辑与专业审核。
- 没有原声服务或请求失败时，应用使用设备语音。
- 备忘录默认保存在浏览器 LocalStorage，不进行云同步。
- 公开部署时，应在托管平台的秘密变量中配置 Token。

## 参与贡献

欢迎新的课程上下文、更精确的词源说明、无障碍改进与测试。提交前请运行：

```bash
pnpm lint
pnpm test
```

## 许可证

[MIT](./LICENSE)
