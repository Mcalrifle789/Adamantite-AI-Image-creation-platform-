'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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

export function WorkspaceApp({ models, initialModelId, initialPrompt }: WorkspaceAppProps) {
  const [activeModelId, setActiveModelId] = useState(initialModelId);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generating, setGenerating] = useState(false);
  const activeModel = useMemo(
    () => models.find((model) => model.id === activeModelId) ?? models[0]!,
    [models, activeModelId],
  );

  function ask(event: React.FormEvent) {
    event.preventDefault();
    if (generating) return;
    setGenerating(true);
    // Mock provider: brief working state, then settle back on the model preview.
    window.setTimeout(() => setGenerating(false), 900);
  }

  return (
    <main className="relative min-h-screen px-4 py-6 text-ada-text sm:px-8 lg:px-12">
      <GridFloor />
      {/* wordmark, top-left — matching the chat mockup */}
      <header className="relative z-10 flex items-start justify-between gap-4">
        <Link href="/" aria-label="Adamantite home" className="inline-flex">
          <Wordmark size="hero" withAgent as="span" className="!text-[clamp(2.6rem,6vw,5rem)]" />
        </Link>
        <Link
          href="/pricing"
          className="neon-input mt-2 hidden h-10 items-center px-5 text-base font-medium text-ada-text sm:inline-flex"
        >
          Upgrade
        </Link>
      </header>

      {/* left column: preview panel + composer. The right half stays open so the rain reads. */}
      <section className="relative z-10 mt-6 w-full max-w-[37rem]">
        <div className="neon-bracket aspect-square w-full p-4 sm:p-5">
          <span aria-hidden className="neon-bracket__corners" />
          <div className="flex h-full flex-col">
            <span className="mb-3 text-lg text-ada-text">
              model: <span className="text-ada-text">{activeModel.displayName}</span>
            </span>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[4px]">
              <Image
                src={activeModel.previewAssetPath}
                alt={prompt || `${activeModel.displayName} generated asset`}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 44rem"
                className={`object-contain transition duration-[var(--dur-4)] ease-[var(--ease-out)] ${
                  generating ? 'scale-[0.98] opacity-60 blur-[1px]' : 'scale-100 opacity-100 blur-0'
                }`}
              />
              {generating ? (
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="h-10 w-10 animate-[ada-spin_0.9s_linear_infinite] rounded-full border-2 border-ada-cyan-300/30 border-t-ada-cyan-300" />
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ask anything… — beveled neon composer */}
        <form onSubmit={ask} className="mt-6">
          <div className="bevel-field h-[3.75rem]">
            <div className="bevel-field__inner flex items-center px-7">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="ask anything..."
                aria-label="Ask anything"
                autoComplete="off"
                className="text-lg"
              />
            </div>
          </div>
        </form>

        {/* low-key model switcher — keeps the panel functional without crowding the mockup look */}
        <div className="mt-6 flex flex-wrap gap-2">
          {models.slice(0, 8).map((model) => {
            const active = model.id === activeModel.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => setActiveModelId(model.id)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-1.5 text-sm transition duration-[var(--dur-2)] ease-[var(--ease-out)] ${
                  active
                    ? 'border-ada-cyan-300 text-ada-cyan-300 shadow-[0_0_18px_-4px_rgb(124_227_255_/_0.85)]'
                    : 'border-[rgb(90_178_255_/_0.3)] text-ada-text-muted hover:border-[rgb(120_205_255_/_0.6)] hover:text-ada-text'
                }`}
              >
                {model.displayName}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
