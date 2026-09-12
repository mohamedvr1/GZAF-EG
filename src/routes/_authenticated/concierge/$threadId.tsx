import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getThreadMessages } from "@/lib/concierge.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/concierge/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const getMsgs = useServerFn(getThreadMessages);

  const { data: initial } = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => getMsgs({ data: { threadId } }),
  });

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
        body: { threadId },
      }),
    [token, threadId],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: threadId,
    transport,
  });

  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (initial && hydratedRef.current !== threadId) {
      hydratedRef.current = threadId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages(initial as any);
    }
  }, [initial, threadId, setMessages]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  const [text, setText] = useState("");
  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = (msg: PromptInputMessage) => {
    const value = msg.text?.trim() ?? text.trim();
    if (!value || isBusy || !token) return;
    void sendMessage({ text: value });
    setText("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="border-b border-white/10 px-8 py-5">
        <p className="eyebrow text-couture-red">In Session</p>
        <h1 className="font-display italic text-2xl">Your Atelier</h1>
      </div>

      <Conversation className="flex-1 bg-noir">
        <ConversationContent className="max-w-3xl mx-auto px-6 py-8">
          {messages.length === 0 && (
            <ConversationEmptyState
              title="Bonjour."
              description="Ask about pieces, occasion styling, or wardrobe curation."
              className="text-paper/60"
            />
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role === "user" ? "user" : "assistant"}>
              <MessageContent
                className={
                  m.role === "user"
                    ? "bg-couture-red text-paper rounded-none border-none"
                    : "bg-transparent text-paper/90"
                }
              >
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <MessageResponse key={i}>{part.text}</MessageResponse>;
                  }
                  if (part.type?.startsWith("tool-")) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const tp = part as any;
                    return (
                      <Tool key={i} defaultOpen={false}>
                        <ToolHeader type={tp.type} state={tp.state} />
                        <ToolContent>
                          <ToolInput input={tp.input} />
                          <ToolOutput output={tp.output ? JSON.stringify(tp.output, null, 2) : null} errorText={tp.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && (
            <div className="pl-2 py-2">
              <Shimmer>Thinking…</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-white/10 bg-noir px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask the concierge…"
              disabled={!token}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!text.trim() || isBusy || !token} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
