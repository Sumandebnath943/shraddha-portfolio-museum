"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import type { PositionedMilestone } from "@/lib/timeline-layout";
import { PHASE_LABEL, PHASE_HUE } from "@/lib/timeline-layout";

export default function MilestonePlacard({
  item,
  onClose,
}: {
  item: PositionedMilestone | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key={item.m.id}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-[var(--hairline)] bg-[var(--bg-2)]/95 shadow-2xl backdrop-blur-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 30 }}
          >
            {/* header / placard plate */}
            <div className="relative shrink-0 border-b border-[var(--hairline)] px-8 pb-6 pt-7">
              <button
                onClick={onClose}
                className="absolute right-6 top-6 text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: item.hue, boxShadow: `0 0 10px ${item.hue}` }}
                />
                <span className="eyebrow" style={{ color: item.hue }}>
                  {PHASE_LABEL[item.m.phase]} · {item.m.dates}
                </span>
              </div>

              <h2 className="display mt-3 text-[2.1rem] text-[var(--ink)]">{item.m.title}</h2>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                {item.m.organization} · {item.m.location}
              </p>
            </div>

            <div className="fancy-scroll flex-1 overflow-y-auto px-8 py-7">
              {/* portrait + tagline */}
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[var(--hairline)] bg-[var(--bg)]">
                  <Image
                    src="/portrait.jpg"
                    alt="Shraddha Sonel"
                    fill
                    sizes="80px"
                    className="object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="signage absolute inset-0 flex items-center justify-center text-base text-[var(--ink-faint)]">
                    SS
                  </div>
                </div>
                <p className="display pt-1 text-xl italic leading-snug text-[var(--gold-bright)]">
                  {item.m.tagline}
                </p>
              </div>

              {/* narrative */}
              <p className="mt-6 text-[0.95rem] leading-relaxed text-[var(--ink-dim)]">
                {item.m.narrative}
              </p>

              <Section title="Disciplines">
                <div className="flex flex-wrap gap-2">
                  {item.m.disciplines.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--ink)]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </Section>

              <Section title="Key Responsibilities">
                <ul className="space-y-2">
                  {item.m.responsibilities.map((r) => (
                    <li key={r} className="flex gap-3 text-sm text-[var(--ink-dim)]">
                      <span className="mt-2 h-px w-3 shrink-0 bg-[var(--gold)]" />
                      {r}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Skills Developed">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {item.m.skills.map((s, i) => (
                    <span key={s} className="text-xs text-[var(--ink-faint)]">
                      {i > 0 && <span className="mr-2 text-[var(--line)]">·</span>}
                      {s}
                    </span>
                  ))}
                </div>
              </Section>

              <Section title="Notable Achievements">
                <ul className="space-y-2">
                  {item.m.achievements.map((a) => (
                    <li key={a} className="flex gap-3 text-sm text-[var(--ink)]">
                      <span style={{ color: item.hue }}>✦</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </Section>

              {item.exhibits.length > 0 && (
                <Section title="Representative Work">
                  <div className="grid grid-cols-2 gap-3">
                    {item.exhibits.slice(0, 4).map((e) => (
                      <Link
                        key={e.slug}
                        href={`/museum?exhibit=${e.slug}`}
                        className="group relative aspect-[4/3] overflow-hidden rounded-md border border-[var(--hairline)]"
                      >
                        {e.image && (
                          <Image
                            src={e.image.thumb}
                            alt={e.title}
                            fill
                            sizes="200px"
                            placeholder="blur"
                            blurDataURL={e.image.blur}
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <span className="text-[0.65rem] leading-tight text-[var(--ink)]">
                            {e.title}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            {/* CTA footer */}
            <div className="shrink-0 border-t border-[var(--hairline)] p-6">
              <Link
                href="/museum"
                className="group flex w-full items-center justify-center gap-3 rounded-full border border-[var(--gold)] py-3.5 text-sm tracking-[0.18em] text-[var(--gold-bright)] uppercase transition-colors hover:bg-[var(--gold)] hover:text-[var(--bg)]"
                style={{ borderColor: PHASE_HUE[item.m.phase] }}
              >
                Enter the Museum
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </div>
  );
}
