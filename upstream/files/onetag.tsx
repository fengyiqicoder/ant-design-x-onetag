import type { BubbleListProps } from '@ant-design/x';
import { Bubble, Sender } from '@ant-design/x';
import XMarkdown from '@ant-design/x-markdown';
import {
  OpenAIChatProvider,
  useXChat,
  type XModelParams,
  type XModelResponse,
  XRequest,
} from '@ant-design/x-sdk';
import { Flex } from 'antd';
import React from 'react';

/**
 * 🔔 请将 API_KEY 替换为您自己的 OneTag AI Key：https://onetagai.com/#get-key
 * 🔔 Please replace API_KEY with your own OneTag AI key: https://onetagai.com/#get-key
 * 该 Key 按公开使用设计，可以写在浏览器代码中
 * The key is designed to be public, so it can stay in browser code
 */
const API_KEY = 'YOUR_ONETAG_KEY';

const BASE_URL = 'https://onetagai.com/v1/chat/completions';

const role: BubbleListProps['role'] = {
  assistant: {
    placement: 'start',
    contentRender: (content: string) => <XMarkdown content={content} />,
  },
  user: {
    placement: 'end',
  },
};

const App = () => {
  const [content, setContent] = React.useState('');
  const [provider] = React.useState(
    new OpenAIChatProvider({
      request: XRequest<XModelParams, XModelResponse>(BASE_URL, {
        manual: true,
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
        params: {
          // 任意模型名都可以，返回中始终为 "onetag"
          // Any model name is accepted, the answer always says "onetag"
          model: 'onetag',
          stream: true,
          max_tokens: 1000,
        },
        middlewares: {
          // 展示 OneTag 返回的失败原因（Key 错误、域名不允许、token 用完），而不只是 HTTP 状态码
          // Show the reason OneTag gives (wrong key, domain not allowed, tokens used up)
          // instead of only the HTTP status
          onResponse: async (response) => {
            if (!response.ok) {
              const data = await response.json().catch(() => null);
              throw new Error(data?.error?.message || `Request failed with status ${response.status}`);
            }
            return response;
          },
        },
      }),
    }),
  );

  const { onRequest, messages, isRequesting, abort } = useXChat({
    provider,
    requestPlaceholder: () => ({
      content: 'Please wait...',
      role: 'assistant',
    }),
    requestFallback: (_, { error, messageInfo }) => {
      if (error.name === 'AbortError') {
        return {
          content: messageInfo?.message?.content || 'Request is aborted',
          role: 'assistant',
        };
      }
      return {
        content: error.message,
        role: 'assistant',
      };
    },
  });

  return (
    <Flex vertical gap="middle">
      <Bubble.List
        style={{ height: 400 }}
        role={role}
        items={messages.map(({ id, message, status }) => ({
          key: id,
          role: message.role,
          content: message.content,
          loading: status === 'loading',
        }))}
      />
      <Sender
        loading={isRequesting}
        value={content}
        onCancel={abort}
        onChange={setContent}
        onSubmit={(nextContent) => {
          onRequest({
            messages: [{ role: 'user', content: nextContent }],
          });
          setContent('');
        }}
      />
    </Flex>
  );
};

export default App;
