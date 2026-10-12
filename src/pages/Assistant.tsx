import { useEffect, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { BrainCircuit, CheckCircle2, MessageCircleQuestion, RotateCcw, Send, ShieldCheck, Stethoscope } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'winvision-mr-assistant-messages';

const readLocalMessages = (): UIMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const Assistant = () => {
  const { session } = useAuth();
  const initialMessages = useMemo(readLocalMessages, []);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const transport = useMemo(() => new DefaultChatTransport<UIMessage>({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
    headers: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
  }), []);
  const { messages, sendMessage, status, stop, error, setMessages } = useChat<UIMessage>({
    id: 'mr-assistant',
    messages: initialMessages,
    transport,
    onFinish: ({ messages: nextMessages }) => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMessages));
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    onError: () => requestAnimationFrame(() => textareaRef.current?.focus()),
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const isBusy = status === 'submitted' || status === 'streaming';
  const clearConversation = () => {
    setMessages([]);
    window.localStorage.removeItem(STORAGE_KEY);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col gap-3">
      <PageHeader title="Ask Assistant" description="Get practical answers from your field data" />
      <section className="grid gap-3 md:grid-cols-[1fr_260px]">
        <Card className="min-h-[560px] overflow-hidden border-border/80 shadow-sm">
          <CardContent className="flex h-[560px] flex-col p-0">
            <Conversation className="flex-1">
              <ConversationContent className="mx-auto w-full max-w-3xl gap-6 p-4 md:p-6">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<MessageCircleQuestion className="h-10 w-10 text-primary" />}
                    title="What would you like to know?"
                    description="Ask about doctors, recent orders, products, visit notes, or targets."
                  />
                ) : messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, index) => part.type === 'text' ? (
                        <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
                      ) : null)}
                    </MessageContent>
                  </Message>
                ))}
                {status === 'submitted' && <Shimmer className="text-sm text-muted-foreground">Reviewing your field data…</Shimmer>}
                {error && <p className="text-sm text-destructive">{error.message || 'The assistant could not answer.'}</p>}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
            <div className="border-t border-border bg-muted/20 p-3 md:p-4">
              <PromptInput
                onSubmit={async ({ text }) => {
                  if (!text.trim() || !session) return;
                  await sendMessage({ text });
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
              >
                <PromptInputTextarea ref={textareaRef} disabled={!session || isBusy} placeholder="Ask about your doctors, orders, products, or targets…" />
                <PromptInputFooter className="justify-end">
                  <PromptInputSubmit status={status} onStop={stop} disabled={!session || (!isBusy && !session)} />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </CardContent>
        </Card>
        <aside className="space-y-3">
          <div className="border-b border-border pb-2">
            <p className="text-sm font-semibold text-foreground">Try asking</p>
            <p className="mt-1 text-xs text-muted-foreground">Use natural language and include a doctor or month when helpful.</p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex gap-2"><Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Which doctors have not been visited recently?</p>
            <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />How am I doing against this month’s targets?</p>
            <p className="flex gap-2"><BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Which products are low in stock?</p>
          </div>
          <div className="flex gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>Your conversation stays on this device. The assistant only receives records you are allowed to access.</span>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={clearConversation} disabled={messages.length === 0}>
            <RotateCcw className="h-4 w-4" /> Clear conversation
          </Button>
        </aside>
      </section>
    </div>
  );
};

export default Assistant;