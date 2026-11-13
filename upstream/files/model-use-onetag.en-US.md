---
group:
  title: Model Integration
  order: 1
title: OneTag AI
order: 2
---

This guide shows how to call a model straight from the browser, with no server of your own, using [OneTag AI](https://onetagai.com) and Ant Design X.

Most model keys must stay on a server, because anyone can read a key that is in page code. A OneTag AI key is designed to be public: it can stay in the browser code of a static site. Each key has a hard token limit, and on the paid plan it can be locked to your domain. OneTag AI is a paid service with a free plan.

OneTag AI supports the "OpenAI compatible mode" chat completions API, so `OpenAIChatProvider` and `XRequest` work without changes. The only things to set are the URL and the key.

### Related Parameter Acquisition

- baseURL - `https://onetagai.com/v1/chat/completions`
- How to get an API Key - enter your email at <https://onetagai.com/#get-key> and the key is sent to you. No card is needed. The free plan is 1,000,000 tokens, one time, with no monthly reset.
- Model - one model, `onetag`. Any model name in the request is accepted.
- API reference - <https://onetagai.com/docs#openai>

### What works and what does not

| Works | Does not work |
| --- | --- |
| Streaming and non-streaming chat completions | Tool calling (`tools`), images, audio and files: text only |
| `max_tokens`, `temperature`, `response_format: { type: 'json_object' }` | `json_schema` response format, `n` > 1, the Responses API |
| Calls from browser pages and browser extensions | Calls from a server, SSR, route handlers or Node scripts: requests without an `Origin` header are refused |

The last row is on purpose: it keeps a public key from being used as a backend key. If your app calls the model from a server, use another provider.

## Integrate with X SDK

Pass the key in the `Authorization` header. The `onResponse` middleware is optional: it shows the reason OneTag AI gives when a call is refused (wrong key, key not allowed on this domain, tokens used up) instead of only the HTTP status.

### Example

<code src="./demo/onetag.tsx" title="Integrate with X SDK" description="Replace YOUR_ONETAG_KEY with your own key before you try this example."></code>
