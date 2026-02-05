"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatSource = {
  doc_id?: string | null;
  title?: string | null;
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
  "What do you work on?",
  "How do you think about building products?",
  "What are your core skills?",
  "What kinds of problems do you enjoy solving?",
  "Tell me about your background",
  "What are you building now?",
  "Who should work with you?",
  "How can I contact the real you?",
];

const STORAGE_KEY_MESSAGES = "ai_me_messages";
const STORAGE_KEY_QUOTA = "ai_me_quota";
const STORAGE_KEY_VISITOR = "ai_me_visitor_id";

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

export default function AiMePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(
    null
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canSend = inputValue.trim().length > 0 && !isSending;

  useEffect(() => {
    const storedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
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

  const visibleSuggestions = useMemo(() => {
    return suggestedQuestions;
  }, []);

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
        <p>An AI shaped by my experience, thinking, and the work I’ve done.</p>
        <div className="chat-status">
          This is an AI representation, not a human chat.
        </div>
      </section>

      <section className="section chat-shell">
        <div className="chat-suggestions">
          {visibleSuggestions.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => void sendMessage(label)}
              disabled={isSending}
            >
              {label}
            </button>
          ))}
        </div>

        <div ref={transcriptRef} className="chat-transcript">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.role}`}
            >
              <div className="chat-role">
                {message.role === "user" ? "You" : "AI"}
              </div>
              <div style={{ whiteSpace: "pre-line" }}>{message.content}</div>
              {message.role === "assistant" && message.limitReached ? (
                <div className="chat-actions">
                  <a
                    className="chat-action secondary"
                    href="mailto:ainbox1010@gmail.com?subject=AI%20Me%20—%20question"
                  >
                    Email me instead.
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
                        <strong>{source.title ?? "Source"}</strong>
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

        <form onSubmit={handleSubmit} className="chat-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask a question..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            autoFocus
          />
          <button
            type="submit"
            disabled={!canSend}
            onMouseDown={(event) => event.preventDefault()}
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
      </section>
    </div>
  );
}
