# Ant Design X without a server

[Ant Design X](https://x.ant.design) chat (`Bubble.List`, `Sender`, `useXChat`) answered by
[OneTag AI](https://onetagai.com), called straight from the browser. No proxy, no backend.

Live demo, served from GitHub Pages: https://fengyiqicoder.github.io/ant-design-x-onetag/

Most model keys have to stay on a server, which is why chat demos usually need a proxy. A OneTag
AI key is designed to be public: it can sit in page code. Each key has a hard token cap, and on
the paid plan it can be locked to your domain.

## No package needed

OneTag speaks the OpenAI chat completions format, so the stock `OpenAIChatProvider` and
`XRequest` from `@ant-design/x-sdk` work as they are. Set the URL and the key:

```tsx
import { OpenAIChatProvider, XRequest, type XModelParams, type XModelResponse } from '@ant-design/x-sdk';

const provider = new OpenAIChatProvider({
  request: XRequest<XModelParams, XModelResponse>('https://onetagai.com/v1/chat/completions', {
    manual: true,
    headers: { Authorization: 'Bearer YOUR_ONETAG_KEY' },
    params: { model: 'onetag', stream: true },
  }),
});
```

Then use `useXChat({ provider })` with `Bubble.List` and `Sender` as in any Ant Design X chat.
A full example is [`upstream/files/onetag.tsx`](upstream/files/onetag.tsx).

[`src/onetag.ts`](src/onetag.ts) is an optional 80-line file you can copy. It adds two things:

- When a call is refused (wrong key, key not allowed on this domain, tokens used up), XRequest
  only says `Fetch failed with status 403`. `readOneTagError` puts OneTag's own message in the
  error, so `requestFallback` can show it.
- If the model fails in the middle of an answer, OneTag sends an `{"error": ...}` event.
  `OpenAIChatProvider` drops it; `OneTagChatProvider` shows it under the partial answer.

## Get a key

Enter your email at [onetagai.com](https://onetagai.com/#get-key) and the key is sent to you.
No card is needed. The free plan is 1,000,000 tokens, one time, with no monthly reset.

On `localhost` this demo uses a shared demo key with a small daily budget shared by everyone, so use your own key on a live site. Elsewhere,
without a key built in, the page asks for one.

## What works

- Streaming answers, follow-up questions (the whole conversation is sent each time).
- `max_tokens`, `temperature`, `response_format: { type: 'json_object' }`.
- Stop button (abort).
- Calls from browser pages and browser extensions.

## What does not

- Tool calling, images, audio and files. Text only.
- `json_schema` responses, `n` > 1, the OpenAI Responses API.
- Calls from a server, SSR, route handlers or Node: requests without an `Origin` header are
  refused, on purpose, so a public key cannot be used as a backend key.

## Run it

```sh
npm install
npm run dev        # http://127.0.0.1:5180, uses the localhost demo key
npm test           # unit tests, mocked
npm run build && npm run preview
node test/browser.mjs            # browser test, mocked (LIVE=1 adds two real calls)
```

To publish: add the `ONETAG_KEY` repository secret, enable GitHub Pages with "GitHub Actions" as
the source, and push to `main`.

## License

MIT
