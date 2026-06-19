"use client";

import { useEffect, useRef, useState } from "react";
import { useMuseum } from "@/store/museum";

// The visitor-facing chat for the guide avatar: a bottom-right "Ask the guide"
// button that opens a corner panel. Messages stream from /api/chat (Groq); while
// she replies, `speaking` drives her Talk animation and `bubble` feeds the
// floating thought-bubble above her head (see Assistant.tsx). Voice is layered
// on with the free browser Web Speech API: she SPEAKS her replies (TTS, toggle
// in the header) and you can ASK by voice (STT, the mic button / the "V" key).
export default function AssistantChat() {
  const chatOpen = useMuseum((s) => s.chatOpen);
  const messages = useMuseum((s) => s.messages);
  const speaking = useMuseum((s) => s.speaking);
  const selected = useMuseum((s) => s.selected);
  const kioskOpen = useMuseum((s) => s.kioskOpen);
  const voiceOn = useMuseum((s) => s.voiceOn);
  const listening = useMuseum((s) => s.listening);
  const setChatOpen = useMuseum((s) => s.setChatOpen);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── speech synthesis (her voice) ──
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const spokenLen = useRef(0); // chars of the current reply already spoken
  const pending = useRef(0); // utterances still queued/playing
  const streamDone = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const vs = window.speechSynthesis.getVoices();
      voiceRef.current =
        vs.find((v) => /^en/i.test(v.lang) && /female|samantha|zira|aria|jenny|libby|sonia|google uk english female/i.test(v.name)) ||
        vs.find((v) => /^en-GB/i.test(v.lang)) ||
        vs.find((v) => /^en/i.test(v.lang)) ||
        vs[0] ||
        null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speakChunk = (text: string) => {
    if (!text) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!useMuseum.getState().voiceOn) return;
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1.02;
    u.pitch = 1.05;
    pending.current += 1;
    const done = () => {
      pending.current = Math.max(0, pending.current - 1);
      if (pending.current === 0 && streamDone.current) useMuseum.getState().setSpeaking(false);
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  };

  // speak whole sentences as they finish streaming (so audio keeps up with text)
  const flushSpeech = (full: string, finished: boolean) => {
    if (!useMuseum.getState().voiceOn) return;
    const tail = full.slice(spokenLen.current);
    const re = /[^.!?]*[.!?]+(?:\s|$)/g;
    let m: RegExpExecArray | null;
    let consumed = 0;
    while ((m = re.exec(tail))) {
      speakChunk(m[0].trim());
      consumed = re.lastIndex;
    }
    spokenLen.current += consumed;
    if (finished) {
      const rest = full.slice(spokenLen.current).trim();
      if (rest) speakChunk(rest);
      spokenLen.current = full.length;
    }
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    pending.current = 0;
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages]);

  const close = () => {
    // re-lock + the rest of the tidy-up happen via the chatOpen effect below
    // (Esc is handled in Museum so the pointer re-locks inside the gesture).
    useMuseum.getState().setChatOpen(false);
    useMuseum.getState().setBubble("");
  };

  // whenever the chat closes (✕, Esc in Museum, kiosk, …) tidy up: cancel any
  // in-flight reply, stop her voice, and leave voice mode.
  useEffect(() => {
    if (chatOpen) return;
    abortRef.current?.abort();
    stopSpeech();
    const st = useMuseum.getState();
    st.setSpeaking(false);
    st.setListening(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    const st = useMuseum.getState();
    if (!text || st.speaking) return;
    setInput("");
    stopSpeech();
    spokenLen.current = 0;
    pending.current = 0;
    streamDone.current = false;
    const history = [...st.messages, { role: "user" as const, content: text }];
    st.addMessage({ role: "user", content: text });
    st.addMessage({ role: "assistant", content: "" });
    st.setSpeaking(true); // drives her Talk animation while she replies
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let full = "";
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
        const chunk = dec.decode(value, { stream: true });
        full += chunk;
        useMuseum.getState().appendToLast(chunk);
        flushSpeech(full, false);
      }
    } catch {
      /* aborted or network error — leave whatever streamed in place */
    } finally {
      streamDone.current = true;
      flushSpeech(full, true);
      // if nothing is being spoken aloud, drop the Talk animation now; otherwise
      // the last utterance's onend will clear it when the audio finishes.
      if (pending.current === 0) useMuseum.getState().setSpeaking(false);
    }
  };

  // ── speech recognition (your voice), hands-free ──
  // Once voice mode is on (the mic button or the "V" key set `listening`) the
  // mic stays live: it auto-restarts after each phrase so you never re-enable
  // it, and it pauses only while SHE is speaking so her TTS doesn't loop back in.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  const stopListening = () => {
    const r = recogRef.current;
    recogRef.current = null;
    if (r) {
      try {
        r.stop();
      } catch {
        /* already stopped */
      }
    }
  };

  const beginListening = () => {
    if (recogRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      useMuseum.getState().setListening(false); // unsupported → drop out of voice mode
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (ev: any) => {
      recogRef.current = null;
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
        useMuseum.getState().setListening(false); // permission denied → leave voice mode
      }
    };
    r.onend = () => {
      recogRef.current = null;
      const st = useMuseum.getState();
      const t = finalText.trim();
      if (t) {
        send(t); // she replies (speaking) → the effect resumes the mic afterwards
        return;
      }
      // a silent pause — keep the mic live if still in voice mode and she's idle
      if (st.listening && st.chatOpen && !st.speaking) beginListening();
    };
    recogRef.current = r;
    try {
      r.start();
    } catch {
      recogRef.current = null;
    }
  };

  useEffect(() => {
    if (chatOpen && listening && !speaking) beginListening();
    else stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, listening, speaking]);

  const toggleVoice = () => {
    const st = useMuseum.getState();
    const next = !st.voiceOn;
    st.setVoiceOn(next);
    if (!next) stopSpeech();
  };
  const toggleMic = () => {
    const st = useMuseum.getState();
    st.setListening(!st.listening);
  };

  if (!chatOpen) {
    if (selected || kioskOpen) return null;
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="pointer-events-auto absolute bottom-5 right-5 z-20 flex items-center gap-1.5 rounded-full border border-[var(--gold)]/80 bg-[var(--bg-2)]/80 px-3 py-1.5 text-[0.62rem] tracking-[0.12em] text-[var(--gold-bright)] uppercase backdrop-blur transition-colors hover:bg-[var(--gold)]/15"
      >
        <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--gold-bright)]" />
        Ask the guide
        <span className="ml-0.5 rounded border border-[var(--gold)]/50 px-1 py-px text-[0.55rem] tracking-normal text-[var(--gold-bright)]">
          C
        </span>
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
        <div className="flex items-center gap-1">
          <button
            onClick={toggleVoice}
            aria-label={voiceOn ? "Mute her voice" : "Let her speak"}
            title={voiceOn ? "Voice on — click to mute" : "Voice off — click to enable"}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-[var(--gold)]/15 ${voiceOn ? "text-[var(--gold-bright)]" : "text-[var(--ink-dim)]"}`}
          >
            {voiceOn ? "🔊" : "🔇"}
          </button>
          <button
            onClick={close}
            aria-label="Close chat"
            title="Close (Esc)"
            className="flex h-7 w-7 items-center justify-center rounded-full text-base text-[var(--ink-dim)] transition-colors hover:bg-[var(--gold)]/15 hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="display text-sm italic leading-relaxed text-[var(--ink-dim)]">
            Hello, and welcome. Ask me anything about Shraddha&apos;s work — a piece you&apos;re
            looking at, a wing, or her career. You can type or tap the mic to speak.
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
        <button
          type="button"
          onClick={toggleMic}
          aria-label={listening ? "Stop listening" : "Speak your question"}
          title={listening ? "Listening… click to stop" : "Speak (or press V)"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
            listening
              ? "animate-pulse border-[var(--gold-bright)] bg-[var(--gold)]/20 text-[var(--gold-bright)]"
              : "border-[var(--hairline)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
          }`}
        >
          🎤
        </button>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Ask about the work…"}
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
