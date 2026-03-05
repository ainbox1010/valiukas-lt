"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FloatingAskAiMe() {
  const pathname = usePathname();
  if (pathname === "/ai") return null;

  return (
    <Link
      href="/ai"
      className="floating-ask-ai-me"
      aria-label="Ask AI Me"
      title="Ask AI Me"
    >
      <span className="floating-ask-ai-me-icon" aria-hidden>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>
      <span className="floating-ask-ai-me-label">Ask AI Me</span>
    </Link>
  );
}
