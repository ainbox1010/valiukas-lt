"use client";

import { useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export default function AiMePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const canSend = inputValue.trim().length > 0 && !isSending;

  const visibleSuggestions = useMemo(() => {
    return suggestedQuestions;
  }, []);

  const scrollToBottom = () => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  };

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
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as { answer?: string };

      if (!data.answer) {
        throw new Error("Missing answer");
      }

      appendMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
      });
    } catch {
      appendMessage({
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: "Sorry — something went wrong. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(inputValue);
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
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-row">
          <input
            type="text"
            placeholder="Ask a question..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={isSending}
          />
          <button type="submit" disabled={!canSend}>
            {isSending ? "Sending…" : "Send"}
          </button>
        </form>
        {isSending ? <div className="chat-status">Sending…</div> : null}
      </section>
    </div>
  );
}
