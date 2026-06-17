"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import type { CareerPhase } from "@/data/types";
import { PHASE_LABEL, PHASE_HUE } from "@/lib/timeline-layout";

export interface Filters {
  phase: CareerPhase | null;
  category: string | null;
  skill: string | null;
  query: string;
}

export interface Facets {
  phases: CareerPhase[];
  categories: string[];
  skills: string[];
}

export default function FilterBar({
  filters,
  setFilters,
  facets,
  matchCount,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  facets: Facets;
  matchCount: number;
}) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (filters.phase ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.skill ? 1 : 0) +
    (filters.query ? 1 : 0);

  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const toggle = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    set({ [key]: filters[key] === value ? null : value } as Partial<Filters>);

  return (
    <div className="pointer-events-auto relative flex items-center gap-2">
      {/* search */}
      <div className="relative hidden sm:block">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <input
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Search the career…"
          className="w-44 rounded-full border border-[var(--hairline)] bg-[var(--bg-2)]/70 py-2 pl-9 pr-3 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] backdrop-blur transition-all focus:w-56 focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      {/* filter button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs tracking-wider uppercase backdrop-blur transition-colors ${
          open || activeCount
            ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-bright)]"
            : "border-[var(--hairline)] bg-[var(--bg-2)]/70 text-[var(--ink-dim)] hover:text-[var(--ink)]"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 2.5h11M3 6.5h7M5 10.5h3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        Filter
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[0.6rem] font-medium text-[var(--bg)]">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fancy-scroll absolute right-0 top-12 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-[var(--hairline)] bg-[var(--bg-2)]/95 p-5 shadow-2xl backdrop-blur-xl"
          >
            <Group title="Career Phase">
              {facets.phases.map((p) => (
                <Chip
                  key={p}
                  active={filters.phase === p}
                  hue={PHASE_HUE[p]}
                  onClick={() => toggle("phase", p)}
                >
                  {PHASE_LABEL[p]}
                </Chip>
              ))}
            </Group>

            <Group title="Design Category">
              {facets.categories.map((c) => (
                <Chip key={c} active={filters.category === c} onClick={() => toggle("category", c)}>
                  {c}
                </Chip>
              ))}
            </Group>

            <Group title="Skill">
              {facets.skills.map((s) => (
                <Chip key={s} active={filters.skill === s} onClick={() => toggle("skill", s)}>
                  {s}
                </Chip>
              ))}
            </Group>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--hairline)] pt-3">
              <span className="text-[0.7rem] text-[var(--ink-faint)]">
                {matchCount} milestone{matchCount === 1 ? "" : "s"}
              </span>
              <button
                onClick={() => setFilters({ phase: null, category: null, skill: null, query: "" })}
                className="text-[0.7rem] tracking-wider text-[var(--ink-dim)] uppercase transition-colors hover:text-[var(--gold-bright)]"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="eyebrow mb-2.5">{title}</h4>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  children,
  active,
  hue,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  hue?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[0.7rem] transition-all ${
        active
          ? "border-transparent text-[var(--bg)]"
          : "border-[var(--hairline)] text-[var(--ink-dim)] hover:border-[var(--ink-faint)] hover:text-[var(--ink)]"
      }`}
      style={active ? { background: hue ?? "var(--gold)" } : undefined}
    >
      {children}
    </button>
  );
}
