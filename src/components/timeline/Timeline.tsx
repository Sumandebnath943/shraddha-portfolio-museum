"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import Starfield from "./Starfield";
import MilestonePlacard from "./MilestonePlacard";
import FilterBar, { type Filters, type Facets } from "./FilterBar";
import {
  getPositionedMilestones,
  getSpineSegments,
  PHASE_LABEL,
  WORLD,
  YEAR_TICKS,
  yearToX,
  type PositionedMilestone,
} from "@/lib/timeline-layout";
import type { CareerPhase } from "@/data/types";

const PHASE_ORDER: CareerPhase[] = ["foundation", "production", "identity", "integrated"];
const ZOOM_MIN = 0.14;
const ZOOM_MAX = 2.6;

export default function Timeline() {
  const items = useMemo(() => getPositionedMilestones(), []);
  const spine = useMemo(() => getSpineSegments(), []);

  const facets = useMemo<Facets>(() => {
    const phases = PHASE_ORDER.filter((p) => items.some((i) => i.m.phase === p));
    const categories = Array.from(
      new Set(items.flatMap((i) => i.exhibits.map((e) => e.category))),
    ).sort();
    const skills = Array.from(new Set(items.flatMap((i) => i.m.skills))).sort();
    return { phases, categories, skills };
  }, [items]);

  const [filters, setFilters] = useState<Filters>({
    phase: null,
    category: null,
    skill: null,
    query: "",
  });
  const [selected, setSelected] = useState<PositionedMilestone | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [zoom, setZoom] = useState(0.6); // throttled mirror of cam.zoom for the UI
  const introRef = useRef(true);
  const zoomEmit = useRef(0.6);

  const matchOf = useCallback(
    (pm: PositionedMilestone) => {
      if (filters.phase && pm.m.phase !== filters.phase) return false;
      if (filters.skill && !pm.m.skills.includes(filters.skill)) return false;
      if (filters.category && !pm.exhibits.some((e) => e.category === filters.category))
        return false;
      if (filters.query.trim()) {
        const q = filters.query.toLowerCase();
        const hay = [
          pm.m.title,
          pm.m.organization,
          pm.m.tagline,
          ...pm.m.skills,
          ...pm.m.disciplines,
          ...pm.m.responsibilities,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    },
    [filters],
  );

  const matchCount = useMemo(() => items.filter(matchOf).length, [items, matchOf]);
  const filtersActive =
    !!filters.phase || !!filters.category || !!filters.skill || !!filters.query.trim();

  // ── camera ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cam = useRef({ x: 0, y: -10, zoom: 0.6 });
  const target = useRef({ x: 0, y: -10, zoom: 0.6 });
  const size = useRef({ w: 1, h: 1 });
  const drag = useRef({ active: false, x: 0, y: 0, moved: 0 });

  const apply = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    const { x, y, zoom } = cam.current;
    const { w: vw, h: vh } = size.current;
    w.style.transform = `translate(${vw / 2}px, ${vh / 2}px) scale(${zoom}) translate(${-x}px, ${-y}px)`;
  }, []);

  const fitOverview = useCallback(() => {
    const { w, h } = size.current;
    const pad = 1.18;
    const zx = w / ((WORLD.maxX - WORLD.minX) * pad);
    const zy = h / ((WORLD.maxY - WORLD.minY) * pad);
    const zoom = Math.max(ZOOM_MIN, Math.min(zx, zy, 0.85));
    target.current = {
      x: (WORLD.minX + WORLD.maxX) / 2,
      y: (WORLD.minY + WORLD.maxY) / 2,
      zoom,
    };
  }, []);

  // rAF lerp loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const c = cam.current;
      const t = target.current;
      if (!drag.current.active) {
        // gentler easing during the intro fly-through, snappier afterwards
        const k = introRef.current ? 0.045 : 0.12;
        c.x += (t.x - c.x) * k;
        c.y += (t.y - c.y) * k;
        c.zoom += (t.zoom - c.zoom) * k;
      }
      apply();
      if (Math.abs(c.zoom - zoomEmit.current) > 0.025) {
        zoomEmit.current = c.zoom;
        setZoom(c.zoom);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [apply]);

  // measure + cinematic intro fly-through
  useEffect(() => {
    let first = true;
    let introTimer = 0;
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      size.current = { w: el.clientWidth, h: el.clientHeight };
      if (first) {
        first = false;
        // begin focused on the earliest milestone…
        const start = [...items].sort((a, b) => a.m.order - b.m.order)[0];
        if (start) {
          cam.current = { x: start.x, y: start.y - 16, zoom: 1.18 };
          target.current = { ...cam.current };
          // …then pull back to reveal the entire constellation
          introTimer = window.setTimeout(() => {
            if (introRef.current) fitOverview();
          }, 1200);
        } else {
          fitOverview();
          cam.current = { ...target.current };
        }
      } else {
        fitOverview();
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.clearTimeout(introTimer);
    };
  }, [fitOverview, items]);

  // any interaction ends the intro and hands the camera to the visitor
  const endIntro = useCallback(() => {
    introRef.current = false;
    setShowIntro(false);
  }, []);

  const focusOn = useCallback((pm: PositionedMilestone) => {
    // sit the node in the upper third so its expanded card has room below
    target.current = { x: pm.x, y: pm.y + 52, zoom: 1.55 };
  }, []);

  // ── pointer interaction (mouse wheel + drag + touch pinch) ───────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef({ active: false, dist: 0 });

  // zoom toward a screen point (mx,my relative to container) by `factor`
  const zoomAtPoint = useCallback((mx: number, my: number, factor: number) => {
    const c = cam.current;
    const { w, h } = size.current;
    const wx = c.x + (mx - w / 2) / c.zoom;
    const wy = c.y + (my - h / 2) / c.zoom;
    const z2 = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target.current.zoom * factor));
    target.current = {
      zoom: z2,
      x: wx - (mx - w / 2) / z2,
      y: wy - (my - h / 2) / z2,
    };
    endIntro();
  }, [endIntro]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      zoomAtPoint(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0012));
    },
    [zoomAtPoint],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    endIntro();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { active: true, dist: Math.hypot(a.x - b.x, a.y - b.y) };
      drag.current.active = false;
    } else {
      drag.current = { active: true, x: e.clientX, y: e.clientY, moved: 0 };
    }
  }, [endIntro]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = pointers.current.get(e.pointerId);
      if (p) {
        p.x = e.clientX;
        p.y = e.clientY;
      }
      // two-finger pinch zoom
      if (pinch.current.active && pointers.current.size >= 2) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2 - rect.left;
        const midY = (a.y + b.y) / 2 - rect.top;
        if (pinch.current.dist > 0) zoomAtPoint(midX, midY, dist / pinch.current.dist);
        pinch.current.dist = dist;
        return;
      }
      // single-pointer pan
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      drag.current.moved += Math.abs(dx) + Math.abs(dy);
      const z = cam.current.zoom;
      cam.current.x -= dx / z;
      cam.current.y -= dy / z;
      target.current.x = cam.current.x;
      target.current.y = cam.current.y;
      if (drag.current.moved > 6) endIntro();
    },
    [zoomAtPoint, endIntro],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (pointers.current.size < 2) pinch.current.active = false;
    if (pointers.current.size === 0) drag.current.active = false;
  }, []);

  const nodeClick = useCallback(
    (pm: PositionedMilestone) => {
      if (drag.current.moved > 6) return; // was a pan, not a click
      focusOn(pm); // fly in; the expanded card appears at this zoom
      endIntro();
    },
    [focusOn, endIntro],
  );

  const zoomBy = (f: number) => {
    target.current.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target.current.zoom * f));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg)] select-none">
      <Starfield cameraRef={cam} />

      {/* world layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div ref={worldRef} className="absolute left-0 top-0 origin-top-left will-change-transform">
          {/* year baseline */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width="1"
            height="1"
          >
            <line
              x1={yearToX(2013.6)}
              y1={300}
              x2={yearToX(2025.4)}
              y2={300}
              stroke="var(--line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {YEAR_TICKS.map((yr) => (
              <g key={yr} transform={`translate(${yearToX(yr)}, 300)`}>
                <line y2={6} stroke="var(--hairline)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text
                  y={22}
                  textAnchor="middle"
                  className="fill-[var(--ink-faint)]"
                  style={{ fontSize: 13, fontFamily: "var(--font-geist-mono)" }}
                >
                  {yr}
                </text>
              </g>
            ))}

            {/* constellation spine */}
            {spine.map((s, i) => (
              <line
                key={i}
                x1={s.ax}
                y1={s.ay}
                x2={s.bx}
                y2={s.by}
                stroke="var(--hairline)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{ opacity: filtersActive ? 0.25 : 0.6, transition: "opacity 0.4s" }}
              />
            ))}
            {/* light travelling forward along the career path */}
            {!filtersActive &&
              spine.map((s, i) => (
                <line
                  key={`flow-${i}`}
                  className="spine-flow"
                  x1={s.ax}
                  y1={s.ay}
                  x2={s.bx}
                  y2={s.by}
                  stroke="var(--gold-bright)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ opacity: 0.7, animationDelay: `${i * 0.42}s` }}
                />
              ))}
          </svg>

          {/* nodes */}
          {items.map((pm) => {
            const on = matchOf(pm);
            const isHover = hovered === pm.m.id;
            const expanded = on && zoom > 1.12;
            return (
              <div
                key={pm.m.id}
                className="absolute left-0 top-0"
                style={{
                  transform: `translate(${pm.x}px, ${pm.y}px) translate(-50%, -50%)`,
                  opacity: on ? 1 : 0.16,
                  filter: on ? "none" : "grayscale(0.6)",
                  transition: "opacity 0.45s ease, filter 0.45s ease",
                  pointerEvents: on ? "auto" : "none",
                  zIndex: expanded || isHover ? 30 : 10,
                }}
                onMouseEnter={() => setHovered(pm.m.id)}
                onMouseLeave={() => setHovered((h) => (h === pm.m.id ? null : h))}
                onClick={() => nodeClick(pm)}
              >
                <Node pm={pm} hover={isHover} expanded={expanded} onOpen={() => setSelected(pm)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── chrome ─────────────────────────────────────────────────── */}
      {/* top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-6 sm:p-8">
        <div>
          <h1 className="signage text-[1.05rem] leading-tight text-[var(--ink)] sm:text-[1.35rem]">
            Shraddha Sonel
          </h1>
          <p className="eyebrow mt-1.5">The Design Museum · A Living Visual Story</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            facets={facets}
            matchCount={matchCount}
          />
          <Link
            href="/museum"
            className="pointer-events-auto hidden items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-xs tracking-wider text-[var(--bg)] uppercase transition-transform hover:scale-[1.03] md:flex"
          >
            Enter Museum →
          </Link>
        </div>
      </header>

      {/* center intro hint */}
      {showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="pointer-events-none absolute inset-x-0 top-[16%] z-20 text-center"
        >
          <p className="display mx-auto max-w-lg px-6 text-2xl italic leading-snug text-[var(--ink-dim)] sm:text-3xl">
            A decade of design, charted as a constellation.
          </p>
          <motion.p
            className="eyebrow mt-5"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            Click any star to explore a chapter
          </motion.p>
        </motion.div>
      )}

      {/* zoom controls */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-1.5 sm:bottom-8 sm:right-8">
        <Ctrl onClick={() => zoomBy(1.35)} label="Zoom in">+</Ctrl>
        <Ctrl onClick={() => zoomBy(1 / 1.35)} label="Zoom out">−</Ctrl>
        <Ctrl onClick={fitOverview} label="Fit overview">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </Ctrl>
      </div>

      {/* bottom hint */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between p-6 sm:p-8">
        <p className="eyebrow">Scroll to zoom · Drag to pan · Click a milestone</p>
        <p className="eyebrow hidden sm:block">Indore → Pune · 2014 – Present</p>
      </footer>

      <MilestonePlacard item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Node({
  pm,
  hover,
  expanded,
  onOpen,
}: {
  pm: PositionedMilestone;
  hover: boolean;
  expanded: boolean;
  onOpen: () => void;
}) {
  const d = pm.r * 2;
  const thumbs = pm.exhibits.filter((e) => e.image).slice(0, 4);
  return (
    <div className="relative flex cursor-pointer flex-col items-center">
      {/* pulsing beacon ring — invites a click while in overview */}
      {!expanded && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: d,
            height: d,
            top: d / 2,
            transform: "translateY(-50%)",
            border: `1.5px solid ${pm.hue}`,
            animation: "node-pulse 3s ease-out infinite",
            animationDelay: `${(pm.m.order % 4) * 0.5}s`,
          }}
        />
      )}
      {/* glow */}
      <div
        className="rounded-full"
        style={{
          width: d,
          height: d,
          background: `radial-gradient(circle, ${pm.hue}cc 0%, ${pm.hue}33 40%, transparent 70%)`,
          boxShadow: hover || expanded ? `0 0 60px ${pm.hue}` : `0 0 24px ${pm.hue}66`,
          transform: hover && !expanded ? "scale(1.18)" : "scale(1)",
          transition: "transform 0.35s ease, box-shadow 0.35s ease",
        }}
      />
      {/* core */}
      <div
        className="absolute rounded-full bg-white"
        style={{
          width: Math.max(5, pm.r * 0.34),
          height: Math.max(5, pm.r * 0.34),
          top: d / 2,
          transform: "translateY(-50%)",
          boxShadow: `0 0 8px #fff`,
        }}
      />

      {/* compact label (overview) */}
      {!expanded && (
        <div className="mt-2 w-48 text-center" style={{ transform: "translateZ(0)" }}>
          <p
            className="display text-[1.15rem] leading-tight text-[var(--ink)]"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.8)" }}
          >
            {pm.m.title}
          </p>
          <p className="mt-0.5 text-[0.7rem] tracking-wider text-[var(--ink-dim)]">{pm.m.dates}</p>
          <p
            className="mt-1.5 text-[0.7rem] italic leading-snug text-[var(--gold-bright)] transition-opacity duration-300"
            style={{ opacity: hover ? 1 : 0 }}
          >
            {pm.m.tagline}
          </p>
        </div>
      )}

      {/* rich preview card (zoomed in) */}
      {expanded && (
        <div
          className="mt-3 w-[19rem] rounded-xl border border-[var(--hairline)] bg-[var(--bg-2)]/85 p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
          style={{ transform: "translateZ(0)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="eyebrow" style={{ color: pm.hue }}>
            {PHASE_LABEL[pm.m.phase]}
          </p>
          <p className="display mt-1 text-[1.5rem] leading-tight text-[var(--ink)]">{pm.m.title}</p>
          <p className="mt-1 text-[0.72rem] tracking-wider text-[var(--ink-dim)]">
            {pm.m.organization} · {pm.m.dates}
          </p>
          <p className="mt-2.5 text-[0.82rem] italic leading-snug text-[var(--ink-dim)]">
            {pm.m.tagline}
          </p>

          {pm.m.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pm.m.skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-[var(--hairline)] px-2 py-0.5 text-[0.62rem] text-[var(--ink-faint)]"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {thumbs.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {thumbs.map((e) => (
                <div
                  key={e.slug}
                  className="aspect-square overflow-hidden rounded-md border border-[var(--hairline)] bg-black/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.image!.thumb}
                    alt={e.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onOpen}
            className="mt-3.5 w-full rounded-full bg-[var(--gold)] py-2 text-[0.66rem] tracking-[0.18em] text-[var(--bg)] uppercase transition-transform hover:scale-[1.02]"
          >
            View the full story →
          </button>
        </div>
      )}
    </div>
  );
}

function Ctrl({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--bg-2)]/70 text-base text-[var(--ink-dim)] backdrop-blur transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-bright)]"
    >
      {children}
    </button>
  );
}
