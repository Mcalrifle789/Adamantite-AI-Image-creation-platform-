'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { PublicModelCard } from '@/components/model/brandAssets';

interface ModelSelectorProps {
  featuredModels: PublicModelCard[];
  allModels: PublicModelCard[];
}

const MODEL_STORAGE_KEY = 'ada.ui.modelId';
const PROMPT_STORAGE_KEY = 'ada.ui.prompt';

// The four hero tiles from the landing mockup, in the exact order and with the exact
// labels shown in the reference art.
const FEATURED_ORDER = ['kling-2-5', 'seedance-2-5', 'nano-banana-2', 'gpt-image-2'];
const TILE_LABELS: Record<string, string> = {
  'kling-2-5': 'Kling (Latest)',
  'seedance-2-5': 'Seedance 2.5',
  'nano-banana-2': 'Nano Banana\n(LATEST)',
  'gpt-image-2': 'GPT-Image 2',
};

export function ModelSelector({ featuredModels, allModels }: ModelSelectorProps) {
  const router = useRouter();
  const fallbackId = featuredModels[0]?.id ?? allModels[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(fallbackId);
  const [prompt, setPrompt] = useState('');

  const tiles = useMemo(() => {
    const byId = new Map(featuredModels.map((model) => [model.id, model]));
    const ordered = FEATURED_ORDER.map((id) => byId.get(id)).filter(Boolean) as PublicModelCard[];
    // Fall back to whatever featured models exist if the config ids ever change.
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
    const params = new URLSearchParams({ model: modelId });
    if (prompt.trim()) params.set('prompt', prompt.trim());
    router.push(`/workspace/demo?${params.toString()}`);
  }

  function submitPrompt(event: React.FormEvent) {
    event.preventDefault();
    openWorkspace(selectedId);
  }

  return (
    <div className="mx-auto grid w-full max-w-[92rem] gap-8 sm:gap-10">
      {/* create something… */}
      <form onSubmit={submitPrompt} className="mx-auto w-full max-w-[80rem]">
        <label htmlFor="prompt" className="sr-only">
          Prompt
        </label>
        <input
          id="prompt"
          name="prompt"
          value={prompt}
          onChange={(event) => updatePrompt(event.target.value)}
          placeholder="create something..."
          autoComplete="off"
          className="neon-input h-[4.25rem] w-full px-8 text-xl tracking-tight sm:text-2xl"
        />
      </form>

      {/* four hero model tiles */}
      <div className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4" role="list" aria-label="Featured models">
        {tiles.map((model) => (
          <button
            key={model.id}
            type="button"
            role="listitem"
            onClick={() => openWorkspace(model.id)}
            className="neon-frame group block overflow-hidden p-3 text-left outline-none focus-visible:border-ada-cyan-300 sm:p-4"
          >
            <span className="mb-3 block whitespace-pre-line px-1 text-lg font-medium leading-tight text-ada-text sm:text-xl">
              {TILE_LABELS[model.id] ?? model.displayName}
            </span>
            <span className="relative block overflow-hidden rounded-[14px] border border-[rgb(90_178_255_/_0.35)] bg-ada-void">
              <Image
                src={model.previewAssetPath}
                alt={`${model.displayName} preview`}
                width={480}
                height={360}
                className="aspect-square w-full object-cover transition duration-[600ms] ease-[var(--ease-out)] group-hover:scale-[1.04]"
              />
            </span>
          </button>
        ))}
      </div>

      {/* more models */}
      <a
        href="#full-catalogue"
        className="group mx-auto mt-1 grid justify-items-center gap-2 text-center outline-none"
        aria-label="More models"
      >
        <span className="text-lg font-medium text-ada-cyan-300 drop-shadow-[0_0_12px_rgb(34_211_238_/_0.6)]">
          More models
        </span>
        <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-ada-cyan-300 text-2xl leading-none text-ada-cyan-300 shadow-[0_0_22px_-4px_rgb(124_227_255_/_0.9)] transition duration-[var(--dur-3)] ease-[var(--ease-out)] group-hover:translate-y-1">
          ↓
        </span>
      </a>
    </div>
  );
}
