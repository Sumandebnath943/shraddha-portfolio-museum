"use client";

import { useEffect } from "react";
import { useMuseum } from "@/store/museum";
import { wings } from "@/content";

// The guide's "where would you like to go?" prompt: a row of wing chips she
// raises a few seconds after greeting. Selection is by NUMBER KEY (1–5), which
// works while the pointer is locked for first-person walking; 0 dismisses. The
// chips are also clickable if the cursor happens to be free.
export default function GuideMenu() {
  const open = useMuseum((s) => s.guideMenuOpen);
  const setGuideMenuOpen = useMuseum((s) => s.setGuideMenuOpen);
  const setGuideTarget = useMuseum((s) => s.setGuideTarget);
  const setBubble = useMuseum((s) => s.setBubble);

  useEffect(() => {
    if (!open) return;
    const pick = (i: number) => {
      const w = wings[i];
      if (!w) return;
      setGuideTarget(w.id); // → Assistant enters "lead" mode and escorts there
      setGuideMenuOpen(false);
    };
    const dismiss = () => {
      setGuideMenuOpen(false);
      setBubble("");
    };
    const onKey = (e: KeyboardEvent) => {
      // leave Escape to the pointer-lock release; use number keys here
      const m = e.code.match(/^(?:Digit|Numpad)(\d)$/);
      if (!m) return;
      e.preventDefault();
      const d = parseInt(m[1], 10);
      if (d === 0) dismiss();
      else if (d >= 1 && d <= wings.length) pick(d - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setGuideMenuOpen, setGuideTarget, setBubble]);

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex flex-col items-center gap-3 px-4">
      <p
        className="signage text-sm text-[var(--ink)]"
        style={{ textShadow: "0 1px 12px rgba(0,0,0,0.9)" }}
      >
        Where would you like to go?
      </p>
      <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {wings.map((w, i) => (
          <button
            key={w.id}
            onClick={() => {
              setGuideTarget(w.id);
              setGuideMenuOpen(false);
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border bg-[var(--bg-2)]/85 px-3.5 py-2 text-xs text-[var(--ink)] backdrop-blur transition-colors hover:bg-[var(--gold)]/15"
            style={{ borderColor: `${w.accent}88` }}
          >
            <span
              className="rounded border px-1.5 py-px text-[0.6rem] text-[var(--gold-bright)]"
              style={{ borderColor: w.accent }}
            >
              {i + 1}
            </span>
            {w.name}
          </button>
        ))}
        <button
          onClick={() => {
            setGuideMenuOpen(false);
            setBubble("");
          }}
          className="pointer-events-auto rounded-full border border-[var(--hairline)] bg-[var(--bg-2)]/70 px-3.5 py-2 text-xs text-[var(--ink-dim)] backdrop-blur transition-colors hover:text-[var(--ink)]"
        >
          <span className="mr-1.5 rounded border border-[var(--hairline)] px-1.5 py-px text-[0.6rem]">
            0
          </span>
          Keep exploring
        </button>
      </div>
      <p
        className="eyebrow opacity-70"
        style={{ textShadow: "0 1px 12px rgba(0,0,0,0.95)" }}
      >
        Press 1–{wings.length} to be guided · 0 to dismiss
      </p>
    </div>
  );
}
