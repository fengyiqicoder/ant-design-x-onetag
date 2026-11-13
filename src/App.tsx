import type { BubbleListProps } from '@ant-design/x';
import { Bubble, Sender } from '@ant-design/x';
import XMarkdown from '@ant-design/x-markdown';
import { useXChat } from '@ant-design/x-sdk';
import { Alert, Button, Flex, Input, Typography } from 'antd';
import React from 'react';
import { DEMO_KEY } from './demo-key';
import { pickKey } from './key';
import { createOneTagProvider } from './onetag';

// Replaced at deploy time by scripts/build-site.sh (from the ONETAG_KEY secret).
const KEY = 'YOUR_ONETAG_KEY';
const STORE = 'onetag-key';

const readStored = () => {
  try {
    return localStorage.getItem(STORE) || '';
  } catch {
    return '';
  }
};

const role: BubbleListProps['role'] = {
  assistant: {
    placement: 'start',
    contentRender: (content: string) => <XMarkdown content={content} />,
  },
  user: { placement: 'end' },
};

const Chat: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [content, setContent] = React.useState('');
  const [provider] = React.useState(() =>
    createOneTagProvider(apiKey, { max_tokens: 1000 }),
  );
  const { onRequest, messages, isRequesting, abort } = useXChat({
    provider,
    requestPlaceholder: () => ({ content: 'Thinking...', role: 'assistant' }),
    requestFallback: (_, { error, messageInfo }) => ({
      role: 'assistant',
      content:
        error.name === 'AbortError'
          ? messageInfo?.message?.content || 'Stopped.'
          : `> ${error.message}`,
    }),
  });

  return (
    <Flex vertical gap="middle" style={{ height: 'min(70vh, 600px)' }}>
      <Bubble.List
        style={{ flex: 1 }}
        role={role}
        items={messages.map(({ id, message, status }) => ({
          key: id,
          role: message.role,
          content: message.content,
          loading: status === 'loading',
        }))}
      />
      <Sender
        value={content}
        onChange={setContent}
        loading={isRequesting}
        onCancel={abort}
        placeholder="Ask anything, press Enter to send"
        onSubmit={(text) => {
          onRequest({ messages: [{ role: 'user', content: text }] });
          setContent('');
        }}
      />
    </Flex>
  );
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = React.useState(() =>
    pickKey({ hostname: location.hostname, pageKey: KEY, stored: readStored(), demoKey: DEMO_KEY }),
  );
  const [draft, setDraft] = React.useState('');

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Ant Design X, answered by OneTag AI
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Bubble.List, Sender and the stock OpenAIChatProvider from @ant-design/x-sdk, calling
        OneTag AI straight from this page. No server. The key is public by design: it has a
        hard token cap and can be locked to a domain.
      </Typography.Paragraph>
      {apiKey ? (
        <Chat apiKey={apiKey} />
      ) : (
        <Flex vertical gap="middle">
          <Alert
            type="info"
            message="This page needs a OneTag AI key."
            description={
              <>
                Enter your email at{' '}
                <a href="https://onetagai.com/#get-key" target="_blank" rel="noreferrer">
                  onetagai.com
                </a>{' '}
                and the key is sent to you. No card. The free plan is 1,000,000 tokens, one
                time, no monthly reset.
              </>
            }
          />
          <Flex gap="small">
            <Input
              aria-label="OneTag AI key"
              placeholder="ot_..."
              value={draft}
              onChange={(e) => setDraft(e.target.value.trim())}
            />
            <Button
              type="primary"
              disabled={!draft}
              onClick={() => {
                try {
                  localStorage.setItem(STORE, draft);
                } catch {
                  // private window: keep it for this visit only
                }
                setApiKey(draft);
              }}
            >
              Use key
            </Button>
          </Flex>
        </Flex>
      )}
    </div>
  );
};

export default App;
