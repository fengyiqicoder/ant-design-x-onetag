// Ant Design X answered by OneTag AI, straight from the browser.
//
// OneTag speaks the OpenAI chat completions format, so the stock OpenAIChatProvider and
// XRequest do the work. This file only adds two things the stock pieces do not do:
//   1. When OneTag refuses a call (bad key, key not allowed on this domain, tokens used up),
//      XRequest would only say "Fetch failed with status 403". readOneTagError reads the
//      message OneTag sends and puts it in the Error, so requestFallback can show it.
//   2. If the model fails in the middle of an answer, OneTag sends {"error": {...}} as a
//      stream event. OpenAIChatProvider drops that event; OneTagChatProvider shows it.
//
// The key is public by design: it can sit in page code. It has a hard token cap, and on the
// paid plan it can be locked to your domain.
import {
  OpenAIChatProvider,
  XRequest,
  type XModelMessage,
  type XModelParams,
  type XModelResponse,
} from '@ant-design/x-sdk';

export const ONETAG_URL = 'https://onetagai.com/v1/chat/completions';

export async function readOneTagError(response: Response): Promise<Response> {
  if (response.ok) return response;
  let message = `OneTag AI answered ${response.status}.`;
  let code = 'OneTagError';
  try {
    const data = await response.json();
    if (data?.error?.message) message = data.error.message;
    if (data?.error?.code) code = data.error.code;
  } catch {
    // not JSON: keep the status line
  }
  const error = new Error(message);
  error.name = code;
  throw error;
}

export function createOneTagRequest(key: string, params: Partial<XModelParams> = {}) {
  return XRequest<XModelParams, XModelResponse>(ONETAG_URL, {
    manual: true,
    headers: { Authorization: `Bearer ${key}` },
    // Any model name is accepted; OneTag always answers as "onetag".
    params: { model: 'onetag', stream: true, ...params },
    middlewares: { onResponse: readOneTagError },
  });
}

type Base = OpenAIChatProvider<XModelMessage, XModelParams, XModelResponse>;

export class OneTagChatProvider extends OpenAIChatProvider<
  XModelMessage,
  XModelParams,
  XModelResponse
> {
  transformMessage(info: Parameters<Base['transformMessage']>[0]) {
    const data = (info.chunk as { data?: string } | undefined)?.data;
    if (typeof data === 'string' && data.includes('"error"')) {
      try {
        const parsed = JSON.parse(data);
        if (parsed?.error?.message) {
          const before = String(info.originMessage?.content ?? '');
          return {
            role: 'assistant',
            content: `${before}${before ? '\n\n' : ''}> ${parsed.error.message}`,
          } as XModelMessage;
        }
      } catch {
        // not an error event
      }
    }
    return super.transformMessage(info);
  }
}

export function createOneTagProvider(key: string, params: Partial<XModelParams> = {}) {
  return new OneTagChatProvider({ request: createOneTagRequest(key, params) });
}
