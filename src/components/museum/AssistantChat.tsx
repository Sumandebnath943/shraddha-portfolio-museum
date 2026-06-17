"use client";

import { useEffect, useRef, useState } from "react";
import { useMuseum } from "@/store/museum";

// The visitor-facing chat for the guide avatar: a bottom-right "Talk to
// Shraddha's Assistant" button that opens a corner panel. Messages stream from
// /api/chat (Groq); while she replies, `speaking` drives her Talk animation and
// `bubble` feeds the floating thought-bubble above her head (see Assistant.tsx).
export default function AssistantChat() {
  const chatOpen = useMuseum((s) => s.chatOpen);
  const messages = useMuseum((s) => s.messages);
  const speaking = useMuseum((s) => s.speaking);
  const selected = useMuseum((s) => s.selected);
  const kioskOpen = useMuseum((s) => s.kioskOpen);
  const setChatOpen = useMuseum((s) => s.setChatOpen);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages]);

  const close = () => {
    abortRef.current?.abort();
    const st = useMuseum.getState();
    st.setChatOpen(false);
    st.setSpeaking(false);
    st.setBubble("");
  };

  const send = async () => {
    const text = input.trim();
    const st = useMuseum.getState();
    if (!text || st.speaking) return;
    setInput("");
    const history = [...st.messages, { role: "user" as const, content: text }];
    st.addMessage({ role: "user", content: text });
    st.addMessage({ role: "assistant", content: "" });
    st.setSpeaking(true); // drives her Talk animation while she replies
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, nearbySlug: st.nearby ?? undefined }),
        signal: ctrl.signal,
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        useMuseum.getState().appendToLast(dec.decode(value, { stream: true }));
      }
    } catch {
      /* aborted or network error — leave whatever streamed in place */
    } finally {
      useMuseum.getState().setSpeaking(false);
    }
  };

  if (!chatOpen) {
    if (selected || kioskOpen) return null;
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="pointer-events-auto absolute bottom-6 right-6 z-20 flex items-center gap-2 rounded-full border border-[var(--gold)] bg-[var(--bg-2)]/80 px-5 py-3 text-xs tracking-[0.16em] text-[var(--gold-bright)] uppercase backdrop-blur transition-colors hover:bg-[var(--gold)]/15"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold-bright)]" />
        Talk to Shraddha&apos;s Assistant
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-6 right-6 z-30 flex h-[60vh] max-h-[460px] w-[340px] max-w-[88vw] flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--bg-2)]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${speaking ? "animate-pulse bg-[var(--gold-bright)]" : "bg-[var(--ink-dim)]"}`}
          />
          <span className="signage text-sm text-[var(--ink)]">Shraddha&apos;s Assistant</span>
        </div>
        <button
          onClick={close}
          aria-label="Close"
          className="text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)]"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="display text-sm italic leading-relaxed text-[var(--ink-dim)]">
            Hello, and welcome. Ask me anything about Shraddha&apos;s work — a piece you&apos;re
            looking at, a wing, or her career.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <span
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--gold)]/90 text-[var(--bg)]"
                  : "bg-[var(--bg)]/60 text-[var(--ink)]"
              }`}
            >
              {m.content || (speaking && i === messages.length - 1 ? "…" : "")}
            </span>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-[var(--hairline)] p-3"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the work…"
          className="min-w-0 flex-1 rounded-full border border-[var(--hairline)] bg-[var(--bg)]/60 px-4 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-dim)] focus:border-[var(--gold)]"
        />
        <button
          type="submit"
          disabled={speaking || !input.trim()}
          className="rounded-full bg-[var(--gold)] px-4 py-2 text-xs tracking-[0.14em] text-[var(--bg)] uppercase transition-transform enabled:hover:scale-[1.04] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
