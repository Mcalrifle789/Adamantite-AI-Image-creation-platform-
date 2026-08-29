'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { PublicModelCard } from '@/components/model/brandAssets';
import { AttachButton } from '@/components/prompt/AttachButton';
import { AttachmentTray } from '@/components/prompt/AttachmentTray';
import { stashAttachments } from '@/components/prompt/attachments';
import { usePromptAttachments } from '@/components/prompt/usePromptAttachments';

interface ModelSelectorProps {
  featuredModels: PublicModelCard[];
  allModels: PublicModelCard[];
}

const MODEL_STORAGE_KEY = 'ada.ui.modelId';
const PROMPT_STORAGE_KEY = 'ada.ui.prompt';

// The four hero tiles, in the reference order.
const FEATURED_ORDER = ['kling-2-5', 'seedance-2-5', 'nano-banana-2', 'gpt-image-2'];

// A distinct — but on-palette — aura per model so each tile reads as its own product.
const ACCENTS: Record<string, string> = {
  'kling-2-5':
    'radial-gradient(60% 60% at 30% 25%, rgb(34 211 238 / 0.55), transparent 70%), radial-gradient(70% 70% at 75% 80%, rgb(30 144 255 / 0.4), transparent 72%)',
  'seedance-2-5':
    'radial-gradient(60% 60% at 70% 25%, rgb(56 160 255 / 0.55), transparent 70%), radial-gradient(70% 70% at 25% 80%, rgb(80 120 255 / 0.4), transparent 72%)',
  'nano-banana-2':
    'radial-gradient(60% 60% at 30% 30%, rgb(120 130 255 / 0.5), transparent 70%), radial-gradient(70% 70% at 78% 78%, rgb(40 200 255 / 0.4), transparent 72%)',
  'gpt-image-2':
    'radial-gradient(60% 60% at 68% 28%, rgb(45 220 210 / 0.5), transparent 70%), radial-gradient(70% 70% at 24% 82%, rgb(30 144 255 / 0.42), transparent 72%)',
};

export function ModelSelector({ featuredModels, allModels }: ModelSelectorProps) {
  const router = useRouter();
  const fallbackId = featuredModels[0]?.id ?? allModels[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(fallbackId);
  const [prompt, setPrompt] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const references = usePromptAttachments({ onRejected: setNotice });

  const tiles = useMemo(() => {
    const byId = new Map(featuredModels.map((model) => [model.id, model]));
    const ordered = FEATURED_ORDER.map((id) => byId.get(id)).filter(Boolean) as PublicModelCard[];
    return ordered.length ? ordered : featuredModels.slice(0, 4);
  }, [featuredModels]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);
      const savedPrompt = window.localStorage.getItem(PROMPT_STORAGE_KEY);
      if (savedModel && allModels.some((model) => model.id === savedModel)) setSelectedId(savedModel);
      if (savedPrompt) setPrompt(savedPrompt);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [allModels]);

  function updatePrompt(value: string) {
    setPrompt(value);
    window.localStorage.setItem(PROMPT_STORAGE_KEY, value);
  }

  function openWorkspace(modelId: string) {
    setSelectedId(modelId);
    window.localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    // Files cannot ride in a query string, so they go through sessionStorage. A short batch is
    // reported on the other side rather than silently dropped — see `stashAttachments`.
    stashAttachments(references.attachments);
    const params = new URLSearchParams({ model: modelId });
    if (prompt.trim()) params.set('prompt', prompt.trim());
    router.push(`/workspace/demo?${params.toString()}`);
  }

  function submitPrompt(event: React.FormEvent) {
    event.preventDefault();
    openWorkspace(selectedId);
  }

  return (
    <div className="mx-auto grid w-full max-w-[80rem] gap-12">
      {/* create something… — full capsule, soft inner glow */}
      <form onSubmit={submitPrompt} className="mx-auto w-full max-w-[46rem]">
        <label htmlFor="prompt" className="sr-only">
          Prompt
        </label>
        <div
          {...references.dropZoneProps}
          data-dragging={references.dragging || undefined}
          className="neon-input relative flex items-center gap-3 px-6 py-1 data-[dragging]:border-ada-cyan-300/80 data-[dragging]:shadow-[0_0_0_2px_rgb(124_227_255_/_0.5),0_0_40px_-10px_rgb(50_170_255_/_0.7)]"
        >
          <SparkIcon className="h-5 w-5 shrink-0 text-ada-cyan-300/80" />
          <input
            id="prompt"
            name="prompt"
            value={prompt}
            onChange={(event) => updatePrompt(event.target.value)}
            onPaste={references.onPaste}
            placeholder="create something..."
            autoComplete="off"
            className="h-14 w-full bg-transparent text-lg text-ada-text outline-none placeholder:text-ada-cyan-300/50 sm:text-xl"
          />
          <AttachButton
            onFiles={(files) => {
              setNotice(null);
              void references.addFiles(files);
            }}
            count={references.attachments.length}
          />
          <button
            type="submit"
            aria-label="Start creating"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(34_211_238_/_0.14)] text-ada-cyan-300 shadow-[0_0_18px_-4px_rgb(34_211_238_/_0.8)] transition duration-[var(--dur-2)] ease-[var(--ease-out)] hover:bg-[rgb(34_211_238_/_0.24)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ada-cyan-300"
          >
            <ArrowIcon className="h-5 w-5" />
          </button>

          {references.dragging ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 grid place-items-center rounded-[inherit] bg-[rgb(4_10_24_/_0.82)] text-sm font-medium text-ada-cyan-100"
            >
              Drop images to attach
            </span>
          ) : null}
        </div>

        <AttachmentTray
          attachments={references.attachments}
          onRemove={references.remove}
          className="mt-3"
        />

        {notice ? (
          <p role="status" className="mt-2 px-2 text-xs text-ada-warning">
            {notice}
          </p>
        ) : (
          <p className="mt-2 px-2 text-xs text-ada-text-muted">
            Attach reference images with <span className="text-ada-cyan-200">+</span>, or drop and paste them here.
          </p>
        )}
      </form>

      {/* four premium model tiles */}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Featured models">
        {tiles.map((model) => {
          const isLatest = model.badges?.includes('latest');
          return (
            <li key={model.id}>
              <button
                type="button"
                onClick={() => openWorkspace(model.id)}
                className="glass-card group flex w-full flex-col gap-4 p-4 text-left focus-visible:outline-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold tracking-tight text-white">
                    {model.displayName}
                  </span>
                  {isLatest ? (
                    <span className="rounded-full border border-ada-cyan-300/40 bg-[rgb(34_211_238_/_0.1)] px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ada-cyan-200 shadow-[0_0_16px_-4px_rgb(34_211_238_/_0.9)]">
                      Latest
                    </span>
                  ) : null}
                </div>

                <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                  <span
                    aria-hidden
                    className="absolute inset-0 blur-[6px] motion-safe:animate-[ada-aura-drift_9s_ease-in-out_infinite]"
                    style={{ backgroundImage: ACCENTS[model.id] }}
                  />
                  <Image
                    src={model.previewAssetPath}
                    alt={`${model.displayName} preview`}
                    width={480}
                    height={480}
                    className="relative h-full w-full object-cover transition duration-[600ms] ease-[var(--ease-out)] group-hover:scale-[1.06]"
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-ada-cyan-200/60">
                    {model.kind}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-white/45 transition group-hover:text-ada-cyan-200">
                    Open
                    <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-[var(--dur-2)] group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* more models */}
      <a
        href="#full-catalogue"
        className="group mx-auto grid justify-items-center gap-2 text-center outline-none"
        aria-label="More models"
      >
        <span className="text-sm font-medium uppercase tracking-[0.28em] text-ada-cyan-200/70 transition group-hover:text-ada-cyan-200">
          More models
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-full border border-ada-cyan-300/40 text-ada-cyan-200 shadow-[0_0_20px_-6px_rgb(124_227_255_/_0.85)] transition duration-[var(--dur-3)] ease-[var(--ease-out)] group-hover:translate-y-1 group-hover:border-ada-cyan-300/70">
          <ChevronIcon className="h-5 w-5" />
        </span>
      </a>
    </div>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3l1.8 4.9L18.8 9.7 13.8 11.5 12 16.4 10.2 11.5 5.2 9.7 10.2 7.9 12 3z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
