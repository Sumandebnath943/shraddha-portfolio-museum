"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { getExhibits, wingById } from "@/content";
import { useMuseum } from "@/store/museum";

// Full-screen exhibit placard: artwork on the left, a clean readable
// case-study column on the right (year → title → justified body → notes).
export default function MuseumPlacard({ onClose }: { onClose: () => void }) {
  const selected = useMuseum((s) => s.selected);
  const all = useMemo(() => getExhibits(), []);
  const e = selected ? all.find((x) => x.slug === selected) : null;
  const wing = e ? wingById[e.wing] : null;

  return (
    <AnimatePresence>
      {e && wing && (
        <motion.div
          className="fixed inset-0 z-50 bg-[#07070a]/97 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            onClick={onClose}
            className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--hairline)] text-[var(--ink-dim)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>

          <div className="flex h-full w-full flex-col overflow-y-auto md:flex-row md:overflow-hidden">
            {/* artwork */}
            <motion.div
              className="flex shrink-0 items-center justify-center p-6 md:h-full md:w-[52%] md:p-12"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {e.image && (
                <div
                  className="relative max-h-[42vh] w-full md:max-h-[78vh]"
                  style={{ aspectRatio: String(e.image.aspect) }}
                >
                  <Image
                    src={e.image.full}
                    alt={e.title}
                    fill
                    sizes="(max-width: 768px) 92vw, 52vw"
                    placeholder="blur"
                    blurDataURL={e.image.blur}
                    className="object-contain drop-shadow-[0_24px_70px_rgba(0,0,0,0.7)]"
                    priority
                  />
                </div>
              )}
            </motion.div>

            {/* case-study column */}
            <motion.div
              className="fancy-scroll flex-1 px-7 pb-16 pt-2 md:h-full md:overflow-y-auto md:px-14 md:py-[12vh]"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mx-auto max-w-[34rem]">
                <p
                  className="eyebrow"
                  style={{ color: wing.accent }}
                >
                  {e.year}
                </p>

                <h2 className="display mt-3 text-[2.6rem] leading-[1.02] text-[var(--ink)] sm:text-[3.1rem]">
                  {e.title}
                </h2>

                <p className="mt-3 text-sm text-[var(--ink-dim)]">
                  {[e.category, e.client, wing.name].filter(Boolean).join("  ·  ")}
                </p>

                <div className="my-7 h-px w-14 bg-[var(--gold)]" />

                <p className="text-[0.98rem] leading-[1.85] text-[var(--ink)]" style={{ textAlign: "justify" }}>
                  {e.overview}
                </p>

                <Para label="The Design Challenge" body={e.challenge} />
                <Para label="The Creative Solution" body={e.solution} />

                <div className="mt-9">
                  <h3 className="eyebrow mb-3">Key Outcomes</h3>
                  <ul className="space-y-2.5">
                    {e.outcomes.map((o) => (
                      <li key={o} className="flex gap-3 text-[0.92rem] leading-relaxed text-[var(--ink-dim)]">
                        <span className="mt-1 text-[var(--gold)]" style={{ color: wing.accent }}>
                          ●
                        </span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <blockquote className="mt-9 border-l-2 pl-5" style={{ borderColor: wing.accent }}>
                  <p className="display text-xl italic leading-snug text-[var(--gold-bright)]">
                    {e.insight}
                  </p>
                  <footer className="mt-2 text-xs tracking-[0.2em] text-[var(--ink-faint)] uppercase">
                    Designer&rsquo;s Insight
                  </footer>
                </blockquote>

                <div className="mt-10 flex flex-wrap gap-2">
                  {e.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--ink-faint)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Para({ label, body }: { label: string; body: string }) {
  return (
    <div className="mt-7">
      <h3 className="eyebrow mb-2">{label}</h3>
      <p
        className="text-[0.95rem] leading-[1.8] text-[var(--ink-dim)]"
        style={{ textAlign: "justify" }}
      >
        {body}
      </p>
    </div>
  );
}
