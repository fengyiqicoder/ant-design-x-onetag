import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  ONETAG_URL,
  OneTagChatProvider,
  createOneTagRequest,
  readOneTagError,
} from '../src/onetag';

const sse = (events: string[]) =>
  new Response(events.map((e) => `data: ${e}\n\n`).join(''), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('readOneTagError', () => {
  it('passes a good response through', async () => {
    const res = sse(['[DONE]']);
    expect(await readOneTagError(res)).toBe(res);
  });

  it('turns an OpenAI-shaped error into an Error with the server message', async () => {
    const res = json(429, {
      error: { message: 'Free tokens used up.', type: 'rate_limit', code: 'quota_exceeded' },
    });
    await expect(readOneTagError(res)).rejects.toMatchObject({
      message: 'Free tokens used up.',
      name: 'quota_exceeded',
    });
  });

  it('falls back to the status when the body is not JSON', async () => {
    const res = new Response('bad gateway', { status: 502 });
    await expect(readOneTagError(res)).rejects.toThrow('OneTag AI answered 502');
  });
});

describe('createOneTagRequest', () => {
  it('posts the OpenAI chat body with the key as a Bearer token and streams the chunks', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return sse([
          '{"choices":[{"delta":{"role":"assistant","content":""}}]}',
          '{"choices":[{"delta":{"content":"Hi"}}]}',
          '{"choices":[{"delta":{},"finish_reason":"stop"}]}',
          '[DONE]',
        ]);
      }),
    );
    const updates: unknown[] = [];
    const request = createOneTagRequest('ot_test', { max_tokens: 300 });
    await new Promise<void>((resolve, reject) => {
      request.options.callbacks = {
        onUpdate: (chunk: unknown) => updates.push(chunk),
        onSuccess: () => resolve(),
        onError: (e: Error) => reject(e),
      };
      request.run({ messages: [{ role: 'user', content: 'Hello' }] });
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(ONETAG_URL);
    expect(ONETAG_URL).toBe('https://onetagai.com/v1/chat/completions');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer ot_test');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toEqual({
      model: 'onetag',
      stream: true,
      max_tokens: 300,
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(updates).toHaveLength(4);
  });

  it('reports the OneTag error message, not only the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(403, {
          error: {
            message: 'This key is not allowed on this domain.',
            type: 'permission',
            code: 'domain_not_allowed',
          },
        }),
      ),
    );
    const request = createOneTagRequest('ot_test');
    const err = await new Promise<Error>((resolve) => {
      request.options.callbacks = {
        onUpdate: () => {},
        onSuccess: () => resolve(new Error('no error')),
        onError: (e: Error) => resolve(e),
      };
      request.run({ messages: [{ role: 'user', content: 'Hello' }] });
    });
    expect(err.message).toBe('This key is not allowed on this domain.');
    expect(err.name).toBe('domain_not_allowed');
  });
});

describe('OneTagChatProvider.transformMessage', () => {
  const provider = new OneTagChatProvider({ request: createOneTagRequest('ot_test') });
  const headers = new Headers({ 'content-type': 'text/event-stream' });
  const step = (content: string, data: string) =>
    provider.transformMessage({
      originMessage: { role: 'assistant', content },
      chunk: { data },
      chunks: [],
      status: 'updating',
      responseHeaders: headers,
    } as any);

  it('appends streamed text like OpenAIChatProvider', () => {
    expect(step('Hel', '{"choices":[{"delta":{"content":"lo"}}]}').content).toBe('Hello');
    expect(step('Hello', '[DONE]').content).toBe('Hello');
  });

  it('shows an error sent inside the stream instead of dropping it', () => {
    const msg = step(
      'Half an ans',
      '{"error":{"message":"The AI provider returned an error. Please try again.","code":"upstream"}}',
    );
    expect(msg.content).toBe(
      'Half an ans\n\n> The AI provider returned an error. Please try again.',
    );
  });
});
