'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { HudFrame } from '@/components/hud/HudFrame';
import { Button } from '@/components/ui/Button';
import { formatTier, logoForModel, type PublicModelCard } from '@/components/model/brandAssets';

interface ModelSelectorProps {
  featuredModels: PublicModelCard[];
  allModels: PublicModelCard[];
}

const MODEL_STORAGE_KEY = 'ada.ui.modelId';
const PROMPT_STORAGE_KEY = 'ada.ui.prompt';

export function ModelSelector({ featuredModels, allModels }: ModelSelectorProps) {
  const fallbackId = featuredModels[0]?.id ?? allModels[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(fallbackId);
  const [prompt, setPrompt] = useState(
    'A faceted obsidian atelier rendering luminous product silhouettes in rain-blue volumetric light',
  );
  const selectedModel = useMemo(
    () => allModels.find((model) => model.id === selectedId) ?? allModels[0],
    [allModels, selectedId],
  );
  const workspaceHref = `/workspace/demo?model=${encodeURIComponent(selectedId)}&prompt=${encodeURIComponent(prompt)}`;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);
      const savedPrompt = window.localStorage.getItem(PROMPT_STORAGE_KEY);
      if (savedModel && allModels.some((model) => model.id === savedModel)) setSelectedId(savedModel);
      if (savedPrompt) setPrompt(savedPrompt);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [allModels]);

  function selectModel(modelId: string) {
    setSelectedId(modelId);
    window.localStorage.setItem(MODEL_STORAGE_KEY, modelId);
  }

  function updatePrompt(value: string) {
    setPrompt(value);
    window.localStorage.setItem(PROMPT_STORAGE_KEY, value);
  }

  return (
    <div className="grid gap-4">
      <HudFrame tone="active" brackets className="max-w-[42rem]">
        <form className="grid gap-4 p-4 sm:p-5" action="/workspace/demo">
          <input type="hidden" name="model" value={selectedId} />
          <label className="text-xs font-medium uppercase text-ada-blue-400" htmlFor="prompt">
            Prompt composer
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={4}
            className="min-h-32 resize-none rounded-md border border-[color:var(--color-ada-line)] bg-ada-surface-2 p-4 text-base text-ada-text outline-none transition duration-[var(--dur-2)] focus:border-ada-cyan-300 focus:shadow-[inset_0_0_0_1px_var(--color-ada-cyan-300)]"
            value={prompt}
            onChange={(event) => updatePrompt(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 text-sm text-ada-text-muted">
              {selectedModel ? (
                <Image
                  src={logoForModel(selectedModel.id)}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-md bg-ada-surface-3 p-1"
                />
              ) : null}
              <span className="truncate">
                Selected: <span className="text-ada-text">{selectedModel?.displayName ?? 'Model'}</span>
              </span>
            </div>
            <Button asChild>
              <Link href={workspaceHref}>Open workspace</Link>
            </Button>
          </div>
        </form>
      </HudFrame>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Featured models">
        {featuredModels.map((model) => {
          const selected = model.id === selectedId;
          return (
            <HudFrame key={model.id} tone={selected ? 'active' : 'default'} brackets={selected}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectModel(model.id)}
                className="group block w-full p-3 text-left outline-none"
              >
                <span className="relative block overflow-hidden rounded-md border border-[color:var(--color-ada-line-quiet)] bg-ada-void">
                  <Image
                    src={model.previewAssetPath}
                    alt={`${model.displayName} preview`}
                    width={320}
                    height={240}
                    className="aspect-[4/3] w-full object-cover transition duration-[var(--dur-4)] group-hover:scale-[1.025]"
                  />
                  <span className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-md border border-[color:var(--color-ada-line)] bg-ada-scrim backdrop-blur-sm">
                    <Image src={logoForModel(model.id)} alt="" width={28} height={28} className="h-7 w-7" />
                  </span>
                </span>
                <span className="mt-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ada-text">{model.displayName}</span>
                    <span className="text-xs uppercase text-ada-blue-400">{formatTier(model.tier)} {model.kind}</span>
                  </span>
                  <span className="font-mono text-xs text-ada-cyan-400">{model.priceCredits.toLocaleString()} cr</span>
                </span>
              </button>
            </HudFrame>
          );
        })}
      </div>
    </div>
  );
}
