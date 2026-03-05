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
    "I represent Tomas's work and thinking.\nAsk about projects — or describe your situation, and I'll respond using his approach to automation and AI.",
};

const suggestedQuestions = [
  "What is your background?",
  "Tell me about a real automation project you implemented.",
  "How do you decide between RPA, AI, and custom software?",
  "How do you evaluate whether AI is actually needed?",
  "How would you design an AI-assisted automation system?",
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

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const regex =
    /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\[([^\]]*)\]\(([^)]+)\)|\*([^*]+?)\*|_([^_]+)_|~~(.+?)~~/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let keyIdx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={`${keyPrefix}-${keyIdx++}`}>{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<strong key={`${keyPrefix}-${keyIdx++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={`${keyPrefix}-${keyIdx++}`} className="chat-inline-code">
          {match[3]}
        </code>
      );
    } else if (match[4] !== undefined && match[5]) {
      parts.push(
        <a
          key={`${keyPrefix}-${keyIdx++}`}
          href={match[5]}
          target="_blank"
          rel="noreferrer"
        >
          {match[4] || match[5]}
        </a>
      );
    } else if (match[6]) {
      parts.push(<em key={`${keyPrefix}-${keyIdx++}`}>{match[6]}</em>);
    } else if (match[7]) {
      parts.push(<em key={`${keyPrefix}-${keyIdx++}`}>{match[7]}</em>);
    } else if (match[8]) {
      parts.push(<del key={`${keyPrefix}-${keyIdx++}`}>{match[8]}</del>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <Fragment>{parts}</Fragment>;
}

function renderLine(line: string, lineIndex: number) {
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = Math.min(headingMatch[1].length, 6);
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return (
      <Tag key={lineIndex} className="chat-heading">
        {renderInlineMarkdown(headingMatch[2], `line-${lineIndex}`)}
      </Tag>
    );
  }

  if (/^[-*_]{3,}\s*$/.test(line)) {
    return <hr key={lineIndex} className="chat-hr" />;
  }

  const blockquoteMatch = line.match(/^>\s?(.*)$/);
  if (blockquoteMatch) {
    return (
      <blockquote key={lineIndex} className="chat-blockquote">
        {renderInlineMarkdown(blockquoteMatch[1], `line-${lineIndex}`)}
      </blockquote>
    );
  }

  const ulMatch = line.match(/^[\-\*\+]\s+(.*)$/);
  if (ulMatch) {
    return (
      <li key={lineIndex} className="chat-list-item">
        {renderInlineMarkdown(ulMatch[1], `line-${lineIndex}`)}
      </li>
    );
  }

  const olMatch = line.match(/^\d+\.\s+(.*)$/);
  if (olMatch) {
    return (
      <li key={lineIndex} className="chat-list-item chat-list-item-ordered">
        {renderInlineMarkdown(olMatch[1], `line-${lineIndex}`)}
      </li>
    );
  }

  const segments = line.split(URL_PATTERN);
  return (
    <Fragment key={`line-${lineIndex}`}>
      {segments.map((segment, segmentIndex) => {
        if (!segment.match(URL_PATTERN)) {
          return (
            <Fragment key={`text-${lineIndex}-${segmentIndex}`}>
              {renderInlineMarkdown(segment, `line-${lineIndex}-${segmentIndex}`)}
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
    </Fragment>
  );
}

function renderMessageContent(content: string) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let listBuffer: JSX.Element[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listBuffer.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} className="chat-list">
          {listBuffer}
        </Tag>
      );
      listBuffer = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^[\-\*\+]\s+/);
    const olMatch = line.match(/^\d+\.\s+/);

    if (ulMatch) {
      if (listType === "ol") flushList();
      listType = "ul";
      listBuffer.push(renderLine(line, i) as JSX.Element);
    } else if (olMatch) {
      if (listType === "ul") flushList();
      listType = "ol";
      listBuffer.push(renderLine(line, i) as JSX.Element);
    } else {
      flushList();
      elements.push(
        <Fragment key={`line-${i}`}>
          {renderLine(line, i)}
          {i < lines.length - 1 ? <br /> : null}
        </Fragment>
      );
    }
  }
  flushList();

  return <>{elements}</>;
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const consumedPrefillRef = useRef<string | null>(null);

  const canSend = inputValue.trim().length > 0 && !isSending;

  useEffect(() => {
    const storedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Always use current initial message copy for the first assistant message
          const normalized =
            parsed[0].role === "assistant"
              ? [initialMessage, ...parsed.slice(1)]
              : parsed;
          setMessages(normalized);
          const hasUserMessage = normalized.some((m) => m.role === "user");
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
    // Clear ?q= from URL so refresh shows empty input
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [isSending]);

  // Pills always visible so user can always click to send
  const visibleSuggestions = suggestedQuestions;

  const scrollToBottom = () => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  };

  const scrollToLastMessageInTranscript = () => {
    const container = transcriptRef.current;
    const child = lastMessageRef.current;
    if (!container || !child) return;
    const containerRect = container.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const offset = childRect.top - containerRect.top;
    const targetScrollTop = container.scrollTop + offset;
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && lastMessageRef.current) {
      requestAnimationFrame(() => scrollToLastMessageInTranscript());
    } else {
      scrollToBottom();
    }
  }, [messages]);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      return next;
    });
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
    <div className="section ai-me-page">
      <section className="hero">
        <h1>AI Me</h1>
        <p>An AI shaped by my experience, thinking, and real project work.</p>
      </section>

      <section className="section chat-shell">
        <p className="chat-scope-notice">
          This is not a general-purpose assistant. It answers <span className="chat-scope-only">only</span> questions related to my professional background, projects, and approach to automation and AI, using documented knowledge sources.
        </p>
        <div ref={transcriptRef} className="chat-transcript">
          {messages.map((message, index) => (
            <div
              key={message.id}
              ref={index === messages.length - 1 ? lastMessageRef : undefined}
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
                    href="mailto:contact@valiukas.lt?subject=AI%20Me%20—%20question"
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
                          {source.slug && source.slug.startsWith("projects/") ? (
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
          {hasStarted ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="chat-action secondary"
              style={{ marginLeft: "auto", fontSize: 12 }}
            >
              Clear chat
            </button>
          ) : null}
        </div>
        {showClearConfirm ? (
          <div className="chat-clear-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-clear-title">
            <div className="chat-clear-modal">
              <h2 id="chat-clear-title" className="chat-clear-title">Clear chat?</h2>
              <p className="chat-clear-text">
                All messages will be permanently lost.
              </p>
              <div className="chat-clear-actions">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="chat-action secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY_MESSAGES);
                    setMessages([initialMessage]);
                    setInputValue("");
                    setHasStarted(false);
                    setShowClearConfirm(false);
                  }}
                  className="chat-action chat-action-destructive"
                >
                  Clear chat
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
