'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AccountMenu } from '@/components/account/AccountMenu';
import { GridFloor } from '@/components/background/GridFloor';
import { Wordmark } from '@/components/brand/Wordmark';
import type { PublicModelCard } from '@/components/model/brandAssets';

interface WorkspaceAppProps {
  models: PublicModelCard[];
  initialModelId: string;
  initialPrompt: string;
  projectId: string;
  monthlyCredits: number;
}

interface Generation {
  id: string;
  modelId: string;
  modelName: string;
  kind: string;
  prompt: string;
  aspect: string;
  assetPath: string;
  createdAt: number;
}

const IMAGE_ASPECTS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const VIDEO_ASPECTS = ['16:9', '9:16', '1:1'];
const SUGGESTIONS = [
  'A neon koi gliding through liquid glass',
  'Obsidian monolith under a cyan aurora',
  'Rain-soaked cyberpunk alley, blue reflections',
  'Chrome orchid blooming in zero gravity',
];
const GEN_KEY = 'ada.workspace.generations';
const CREDIT_KEY = 'ada.workspace.credits';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function WorkspaceApp({ models, initialModelId, initialPrompt, monthlyCredits }: WorkspaceAppProps) {
  const [activeModelId, setActiveModelId] = useState(initialModelId);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspect, setAspect] = useState('16:9');
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<Generation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [credits, setCredits] = useState(monthlyCredits);
  const timerRef = useRef<number | null>(null);

  const activeModel = useMemo(
    () => models.find((model) => model.id === activeModelId) ?? models[0]!,
    [models, activeModelId],
  );
  const aspects = activeModel.kind === 'video' ? VIDEO_ASPECTS : IMAGE_ASPECTS;
  // Derive the effective aspect so switching to a video/image model never leaves an invalid value
  // (no setState-in-effect needed).
  const safeAspect = aspects.includes(aspect) ? aspect : aspects[0]!;
  const current = useMemo(
    () => history.find((generation) => generation.id === currentId) ?? history[0] ?? null,
    [history, currentId],
  );

  // Hydrate persisted state after mount (deferred so setState is not called in the effect body,
  // and to avoid an SSR mismatch).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const savedGen = window.localStorage.getItem(GEN_KEY);
        if (savedGen) {
          const parsed = JSON.parse(savedGen) as Generation[];
          if (Array.isArray(parsed) && parsed.length) {
            setHistory(parsed);
            setCurrentId(parsed[0]!.id);
          }
        }
        const savedCredits = window.localStorage.getItem(CREDIT_KEY);
        if (savedCredits && Number.isFinite(Number(savedCredits))) setCredits(Number(savedCredits));
      } catch {
        /* ignore malformed storage */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const persist = useCallback((generations: Generation[], nextCredits: number) => {
    try {
      window.localStorage.setItem(GEN_KEY, JSON.stringify(generations.slice(0, 24)));
      window.localStorage.setItem(CREDIT_KEY, String(nextCredits));
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  function generate() {
    if (generating) return;
    const trimmed = prompt.trim();
    if (!trimmed) {
      setStatus({ tone: 'error', text: 'Describe what you want to create first.' });
      return;
    }
    if (credits < activeModel.priceCredits) {
      setStatus({ tone: 'error', text: 'Not enough credits — upgrade your plan to keep creating.' });
      return;
    }

    setGenerating(true);
    setStatus({ tone: 'info', text: `Generating with ${activeModel.displayName}…` });

    timerRef.current = window.setTimeout(() => {
      const generation: Generation = {
        id: newId(),
        modelId: activeModel.id,
        modelName: activeModel.displayName,
        kind: activeModel.kind,
        prompt: trimmed,
        aspect: safeAspect,
        assetPath: activeModel.previewAssetPath,
        createdAt: Date.now(),
      };
      const nextHistory = [generation, ...history].slice(0, 24);
      const nextCredits = credits - activeModel.priceCredits;
      setHistory(nextHistory);
      setCurrentId(generation.id);
      setCredits(nextCredits);
      persist(nextHistory, nextCredits);
      setGenerating(false);
      setStatus({ tone: 'info', text: 'Done — added to your gallery.' });
    }, 950);
  }

  function onPromptKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      generate();
    }
  }

  function download() {
    if (!current) return;
    const link = document.createElement('a');
    link.href = current.assetPath;
    link.download = `${current.modelId}-${current.id.slice(0, 6)}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function copyPrompt() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.prompt);
      setStatus({ tone: 'info', text: 'Prompt copied to clipboard.' });
    } catch {
      setStatus({ tone: 'error', text: 'Could not copy prompt.' });
    }
  }

  function clearGallery() {
    setHistory([]);
    setCurrentId(null);
    try {
      window.localStorage.removeItem(GEN_KEY);
    } catch {
      /* ignore */
    }
  }

  const aspectClass =
    safeAspect === '1:1'
      ? 'aspect-square'
      : safeAspect === '9:16'
        ? 'aspect-[9/16]'
        : safeAspect === '3:4'
          ? 'aspect-[3/4]'
          : safeAspect === '4:3'
            ? 'aspect-[4/3]'
            : 'aspect-video';

  return (
    <main className="relative min-h-screen px-4 py-6 text-ada-text sm:px-8 lg:px-12">
      <GridFloor />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" aria-label="Adamantite home" className="inline-flex">
          <Wordmark size="hero" withAgent as="span" className="!text-[clamp(2.4rem,5vw,4rem)]" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-ada-cyan-300/35 bg-[rgb(34_211_238_/_0.08)] px-4 py-2 text-sm font-medium text-ada-cyan-100 shadow-[0_0_20px_-8px_rgb(34_211_238_/_0.8)] backdrop-blur-md">
            <span className="font-mono tabular-nums">{credits.toLocaleString()}</span>
            <span className="ml-1.5 text-ada-cyan-200/70">credits</span>
          </div>
          <Link
            href="/pricing"
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-ada-text-muted transition hover:border-ada-cyan-300/50 hover:text-ada-text"
          >
            Upgrade
          </Link>
          {/* `showName={false}`: the credit pill already owns the horizontal budget here. */}
          <AccountMenu showName={false} />
        </div>
      </header>

      <div className="relative z-10 mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Main studio column ─────────────────────────────────────── */}
        <section className="flex flex-col gap-5">
          <div className="neon-bracket w-full p-4 sm:p-5">
            <span aria-hidden className="neon-bracket__corners" />
            <div className="flex h-full flex-col">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-ada-text-muted">
                  model: <span className="text-ada-text">{activeModel.displayName}</span>
                  <span className="mx-2 text-white/25">·</span>
                  {safeAspect}
                </span>
                {current ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyPrompt}
                      className="rounded-full border border-white/12 px-3 py-1 text-xs text-ada-text-muted transition hover:border-ada-cyan-300/50 hover:text-ada-text"
                    >
                      Copy prompt
                    </button>
                    <button
                      type="button"
                      onClick={download}
                      className="rounded-full border border-white/12 px-3 py-1 text-xs text-ada-text-muted transition hover:border-ada-cyan-300/50 hover:text-ada-text"
                    >
                      Download
                    </button>
                  </div>
                ) : null}
              </div>

              <div className={`relative mx-auto w-full overflow-hidden rounded-[6px] ${aspectClass} max-h-[56vh]`}>
                {current ? (
                  <Image
                    key={current.id}
                    src={current.assetPath}
                    alt={current.prompt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className={`object-contain transition duration-[var(--dur-4)] ease-[var(--ease-out)] ${
                      generating ? 'scale-[0.98] opacity-60 blur-[1px]' : 'scale-100 opacity-100 blur-0'
                    }`}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-center">
                    <div className="max-w-xs">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-ada-cyan-300/40 text-ada-cyan-200 shadow-[0_0_22px_-6px_rgb(124_227_255_/_0.8)]">
                        ✦
                      </div>
                      <p className="text-sm text-ada-text-muted">
                        Describe an idea below and press Generate to create your first asset.
                      </p>
                    </div>
                  </div>
                )}
                {generating ? (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="h-10 w-10 animate-[ada-spin_0.9s_linear_infinite] rounded-full border-2 border-ada-cyan-300/30 border-t-ada-cyan-300" />
                  </span>
                ) : null}
              </div>

              {current ? (
                <p className="mt-3 line-clamp-2 text-sm text-ada-text-muted">{current.prompt}</p>
              ) : null}
            </div>
          </div>

          {/* composer */}
          <div>
            <div className="bevel-field h-[3.75rem]">
              <div className="bevel-field__inner flex items-center gap-3 px-6">
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={onPromptKeyDown}
                  placeholder="describe what you want to create..."
                  aria-label="Prompt"
                  autoComplete="off"
                  className="text-base"
                />
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating}
                  className="shrink-0 rounded-full bg-[rgb(34_211_238_/_0.16)] px-5 py-2 text-sm font-semibold text-ada-cyan-100 shadow-[0_0_18px_-4px_rgb(34_211_238_/_0.85)] transition duration-[var(--dur-2)] hover:bg-[rgb(34_211_238_/_0.26)] hover:text-white disabled:opacity-50"
                >
                  {generating ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
            {status ? (
              <p
                role="status"
                className={`mt-2 px-2 text-xs ${status.tone === 'error' ? 'text-ada-danger' : 'text-ada-cyan-200/80'}`}
              >
                {status.text}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-ada-text-muted transition hover:border-ada-cyan-300/40 hover:text-ada-text"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* controls */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-panel p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-ada-cyan-200/60">Model</div>
              <div className="flex flex-wrap gap-2">
                {models.slice(0, 8).map((model) => {
                  const active = model.id === activeModel.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setActiveModelId(model.id)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-xs transition duration-[var(--dur-2)] ${
                        active
                          ? 'border-ada-cyan-300 text-ada-cyan-100 shadow-[0_0_16px_-4px_rgb(124_227_255_/_0.85)]'
                          : 'border-white/12 text-ada-text-muted hover:border-ada-cyan-300/50 hover:text-ada-text'
                      }`}
                    >
                      {model.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="glass-panel p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-ada-cyan-200/60">
                Aspect ratio
              </div>
              <div className="flex flex-wrap gap-2">
                {aspects.map((ratio) => {
                  const active = ratio === safeAspect;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspect(ratio)}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition duration-[var(--dur-2)] ${
                        active
                          ? 'border-ada-cyan-300 text-ada-cyan-100 shadow-[0_0_16px_-6px_rgb(124_227_255_/_0.85)]'
                          : 'border-white/12 text-ada-text-muted hover:border-ada-cyan-300/50 hover:text-ada-text'
                      }`}
                    >
                      {ratio}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ada-text-muted">
                <span>Cost</span>
                <span className="font-mono text-ada-cyan-200">{activeModel.priceCredits.toLocaleString()} credits</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Gallery column ─────────────────────────────────────────── */}
        <aside className="glass-panel flex h-fit flex-col gap-4 p-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Gallery <span className="ml-1 font-mono text-xs text-ada-text-muted">{history.length}</span>
            </h2>
            {history.length ? (
              <button
                type="button"
                onClick={clearGallery}
                className="text-xs text-ada-text-muted transition hover:text-ada-danger"
              >
                Clear
              </button>
            ) : null}
          </div>

          {history.length ? (
            <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
              {history.map((generation) => {
                const active = generation.id === current?.id;
                return (
                  <button
                    key={generation.id}
                    type="button"
                    onClick={() => setCurrentId(generation.id)}
                    className={`group overflow-hidden rounded-xl border text-left transition duration-[var(--dur-2)] ${
                      active
                        ? 'border-ada-cyan-300/70 shadow-[0_0_20px_-8px_rgb(124_227_255_/_0.9)]'
                        : 'border-white/10 hover:border-ada-cyan-300/40'
                    }`}
                  >
                    <span className="relative block aspect-square bg-black/50">
                      <Image
                        src={generation.assetPath}
                        alt={generation.prompt}
                        fill
                        sizes="160px"
                        className="object-cover transition group-hover:scale-105"
                      />
                    </span>
                    <span className="block px-2 py-1.5">
                      <span className="block truncate text-[0.7rem] text-ada-text">{generation.modelName}</span>
                      <span className="block text-[0.65rem] text-ada-text-muted">{timeAgo(generation.createdAt)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/12 px-4 py-8 text-center text-xs text-ada-text-muted">
              Your generations will appear here.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
