---
group:
  title: 模型接入
  order: 1
title: OneTag AI
order: 2
---

这篇指南将介绍如何借助 [OneTag AI](https://onetagai.com) 和 Ant Design X，在浏览器里直接调用模型，不需要自己的服务端。

大多数模型的 Key 只能放在服务端，因为写在页面代码里的 Key 谁都能看到。OneTag AI 的 Key 本身就是按公开使用设计的：可以直接写在静态站点的浏览器代码里。每个 Key 都有硬性的 token 上限，付费版还可以把 Key 锁定到你的域名。OneTag AI 是付费服务，提供免费额度。

OneTag AI 支持「兼容 OpenAI 模式」的 chat completions 接口，因此 `OpenAIChatProvider` 和 `XRequest` 无需改动即可使用，只需要设置地址和 Key。

### 相关参数获取

- baseURL - `https://onetagai.com/v1/chat/completions`
- 如何获取 API Key - 在 <https://onetagai.com/#get-key> 填写邮箱，Key 会发送到你的邮箱，无需绑卡。免费额度为 1,000,000 tokens，一次性发放，不按月重置。
- 模型 - 只有一个模型 `onetag`，请求中填写任意模型名都可以。
- 接口文档 - <https://onetagai.com/docs#openai>

### 支持与不支持

| 支持 | 不支持 |
| --- | --- |
| 流式和非流式的 chat completions | 工具调用（`tools`）、图片、音频和文件：仅支持文本 |
| `max_tokens`、`temperature`、`response_format: { type: 'json_object' }` | `json_schema` 格式、`n` > 1、Responses API |
| 从浏览器页面和浏览器扩展发起的请求 | 从服务端、SSR、路由处理函数或 Node 脚本发起的请求：没有 `Origin` 请求头的请求会被拒绝 |

最后一行是有意为之：这样公开的 Key 不能被当作后端 Key 使用。如果你的应用需要在服务端调用模型，请选择其他服务。

## 使用 X SDK 接入

通过 `Authorization` 请求头传入 Key。`onResponse` 中间件是可选的：当请求被拒绝时（Key 错误、Key 不允许在当前域名使用、token 用完），它会展示 OneTag AI 返回的原因，而不只是 HTTP 状态码。

### 示例

<code src="./demo/onetag.tsx" title="使用 X SDK 接入" description="请先将 YOUR_ONETAG_KEY 替换为你自己的 Key 再试用此示例。"></code>
