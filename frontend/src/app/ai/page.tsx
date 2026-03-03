"use client";

import { Fragment, useEffect, useRef, useState } from "react";

type ChatSource = {
  doc_id?: string | null;
  title?: string | null;
  slug?: string | null;
  section?: string | null;
  chunk_id?: string | null;
  score?: number | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  limitReached?: boolean;
};

const initialMessage: ChatMessage = {
  id: "init",
  role: "assistant",
  content:
    "Hi — I’m an AI representation of Tomas.\nI answer based on his experience, projects, and documented thinking.\nHow can I help?",
};

const suggestedQuestions = [
  "How would you design an AI-assisted automation system?",
  "When should RPA be used instead of custom software?",
  "How do you evaluate whether AI is actually needed?",
  "How do you approach automation?",
  "What is your background?",
];

const STORAGE_KEY_MESSAGES = "ai_me_messages";
const STORAGE_KEY_QUOTA = "ai_me_quota";
const STORAGE_KEY_VISITOR = "ai_me_visitor_id";
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const getVisitorId = () => {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(STORAGE_KEY_VISITOR);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(STORAGE_KEY_VISITOR, generated);
  return generated;
};

function renderMessageContent(content: string) {
  const lines = content.split("\n");

  return lines.map((line, lineIndex) => {
    const segments = line.split(URL_PATTERN);
    return (
      <Fragment key={`line-${lineIndex}`}>
        {segments.map((segment, segmentIndex) => {
          if (!segment.match(URL_PATTERN)) {
            return (
              <Fragment key={`text-${lineIndex}-${segmentIndex}`}>
                {segment}
              </Fragment>
            );
          }

          const trailingPunctuationMatch = segment.match(/[.,!?;:)]+$/);
          const trailingPunctuation = trailingPunctuationMatch?.[0] ?? "";
          const href = trailingPunctuation
            ? segment.slice(0, -trailingPunctuation.length)
            : segment;

          return (
            <Fragment key={`url-${lineIndex}-${segmentIndex}`}>
              <a href={href} target="_blank" rel="noreferrer">
                {href}
              </a>
              {trailingPunctuation}
            </Fragment>
          );
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </Fragment>
    );
  });
}

export default function AiMePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(
    null
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const consumedPrefillRef = useRef<string | null>(null);

  const canSend = inputValue.trim().length > 0 && !isSending;

  useEffect(() => {
    const storedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          const hasUserMessage = parsed.some((m) => m.role === "user");
          if (hasUserMessage) setHasStarted(true);
        }
      } catch {
        // Ignore invalid storage.
      }
    }

    const storedQuota = localStorage.getItem(STORAGE_KEY_QUOTA);
    if (storedQuota) {
      try {
        const parsed = JSON.parse(storedQuota) as {
          remaining: number;
          limit: number;
        };
        if (
          typeof parsed.remaining === "number" &&
          typeof parsed.limit === "number"
        ) {
          setQuota(parsed);
        }
      } catch {
        // Ignore invalid storage.
      }
    }

    const loadQuota = async () => {
      try {
        const visitorId = getVisitorId();
        const response = await fetch(
          `/api/limits${visitorId ? `?visitor_id=${visitorId}` : ""}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          remaining?: number | null;
          limit?: number | null;
        };
        if (typeof data.remaining === "number" && typeof data.limit === "number") {
          setQuota({ remaining: data.remaining, limit: data.limit });
        }
      } catch {
        // Ignore quota load errors for now.
      }
    };

    void loadQuota();
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (quota) {
      localStorage.setItem(STORAGE_KEY_QUOTA, JSON.stringify(quota));
    }
  }, [quota, isHydrated]);

  useEffect(() => {
    if (!isSending) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isSending]);

  // Prefill from URL ?q= (e.g. from "Ask AI Me about projects" link)
  useEffect(() => {
    if (isSending || typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!query || consumedPrefillRef.current === query) return;
    setInputValue(query);
    consumedPrefillRef.current = query;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isSending]);

  // Pills always visible so user can always click to send
  const visibleSuggestions = suggestedQuestions;

  const scrollToBottom = () => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      return next;
    });
    requestAnimationFrame(scrollToBottom);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputValue("");
    requestAnimationFrame(() => inputRef.current?.focus());

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    appendMessage(userMessage);
    setHasStarted(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, visitor_id: getVisitorId() }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as {
        answer?: string;
        sources?: ChatSource[];
        limit_reached?: boolean;
        remaining?: number | null;
        limit?: number | null;
      };

      if (!data.answer) {
        throw new Error("Missing answer");
      }

      appendMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        sources: data.sources ?? [],
        limitReached: data.limit_reached ?? false,
      });
      if (typeof data.remaining === "number" && typeof data.limit === "number") {
        setQuota({ remaining: data.remaining, limit: data.limit });
      }
    } catch {
      appendMessage({
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: "Sorry — something went wrong. Please try again.",
      });
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    inputRef.current?.focus();
    void sendMessage(inputValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      inputRef.current?.focus();
      void sendMessage(inputValue);
    }
  };

  return (
    <div className="section">
      <section className="hero">
        <h1>AI Me</h1>
        <p>An AI shaped by my experience, thinking, and real project work.</p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY_MESSAGES);
            setMessages([initialMessage]);
            setInputValue("");
            setHasStarted(false);
          }}
          className="chat-action secondary"
          style={{ marginTop: 8, fontSize: 12 }}
        >
          Clear chat
        </button>
      </section>

      <section className="section chat-shell">
        <div ref={transcriptRef} className="chat-transcript">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.role}`}
            >
              <div className="chat-role">
                {message.role === "user" ? "You" : "AI"}
              </div>
              <div>{renderMessageContent(message.content)}</div>
              {message.role === "assistant" && message.limitReached ? (
                <div className="chat-actions">
                  <a
                    className="chat-action secondary"
                    href="mailto:ai.inquiry7@gmail.com?subject=AI%20Me%20—%20question"
                  >
                    Email me
                  </a>
                </div>
              ) : null}
              {message.role === "assistant" &&
              message.sources &&
              message.sources.length > 0 ? (
                <details className="chat-sources">
                  <summary>Sources</summary>
                  <div className="chat-sources-list">
                    {message.sources.map((source, index) => (
                      <div key={`${message.id}-source-${index}`}>
                        <strong>
                          {source.slug ? (
                            <a href={`/${source.slug}`}>{source.title ?? "Source"}</a>
                          ) : (
                            source.title ?? "Source"
                          )}
                        </strong>
                        <div>
                          {source.doc_id ? `doc_id: ${source.doc_id}` : null}
                          {source.section ? ` · section: ${source.section}` : null}
                          {source.chunk_id ? ` · chunk: ${source.chunk_id}` : null}
                          {typeof source.score === "number"
                            ? ` · score: ${source.score.toFixed(3)}`
                            : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          ))}
          {isSending ? (
            <div className="chat-message assistant">
              <div className="chat-role">AI</div>
              <div className="chat-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="chat-input-row"
          style={{ isolation: "isolate" }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about product, process, or company systems — automation and AI included…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            autoComplete="off"
            autoFocus
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </form>
        <div className="chat-status">
          <span>{isSending ? "Sending…" : ""}</span>
          <span>
            {quota
              ? `Requests left: ${quota.remaining} out of ${quota.limit} today`
              : ""}
          </span>
        </div>
        <div className="chat-suggestions" style={{ isolation: "isolate" }}>
          {visibleSuggestions.map((label) => (
            <button
              key={label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isSending) return;
                void sendMessage(label);
              }}
              disabled={isSending}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
