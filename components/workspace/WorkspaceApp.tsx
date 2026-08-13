'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Wordmark } from '@/components/brand/Wordmark';
import { HudFrame } from '@/components/hud/HudFrame';
import { Button } from '@/components/ui/Button';
import { formatTier, logoForModel, type PublicModelCard } from '@/components/model/brandAssets';

interface WorkspaceAppProps {
  models: PublicModelCard[];
  initialModelId: string;
  initialPrompt: string;
  projectId: string;
  monthlyCredits: number;
}

const projects = [
  { id: 'demo', name: 'Obsidian atelier', count: 24 },
  { id: 'campaign', name: 'Launch cuts', count: 11 },
  { id: 'archive', name: 'Reference vault', count: 38 },
];

export function WorkspaceApp({
  models,
  initialModelId,
  initialPrompt,
  projectId,
  monthlyCredits,
}: WorkspaceAppProps) {
  const [activeModelId, setActiveModelId] = useState(initialModelId);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [progress, setProgress] = useState(73);
  const [history, setHistory] = useState(models.slice(0, 6));
  const activeModel = useMemo(
    () => models.find((model) => model.id === activeModelId) ?? models[0]!,
    [models, activeModelId],
  );

  function generateEdit() {
    setProgress((current) => (current >= 96 ? 28 : Math.min(96, current + 11)));
    setHistory((current) => [activeModel, ...current.filter((model) => model.id !== activeModel.id)].slice(0, 6));
  }

  function downloadPreview() {
    const link = document.createElement('a');
    link.href = activeModel.previewAssetPath;
    link.download = `${activeModel.id}-preview.svg`;
    link.click();
  }

  return (
    <main className="min-h-screen px-4 py-4 text-ada-text sm:px-5">
      <div className="mx-auto grid max-w-[100rem] gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)_21rem]">
        <HudFrame className="lg:min-h-[calc(100vh-2rem)]">
          <aside className="flex h-full flex-col gap-5 p-4">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" aria-label="Adamantite home">
                <Wordmark size="header" />
              </Link>
              <Button asChild variant="ghost" size="sm">
                <Link href="/pricing">Plans</Link>
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={() => setPrompt('')}>
              New project
            </Button>
            <nav aria-label="Projects" className="grid gap-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/workspace/${project.id}`}
                  className={`rounded-md border px-3 py-3 transition duration-[var(--dur-2)] hover:-translate-y-0.5 hover:bg-ada-surface-2 ${projectId === project.id ? 'border-ada-blue-500 bg-ada-surface-2 shadow-[var(--glow-1)]' : 'border-[color:var(--color-ada-line-quiet)] bg-transparent'}`}
                >
                  <span className="block font-medium">{project.name}</span>
                  <span className="font-mono text-xs text-ada-text-muted">{project.count} generations</span>
                </Link>
              ))}
            </nav>
            <div className="mt-auto rounded-md border border-[color:var(--color-ada-line-quiet)] bg-ada-surface-2 p-3">
              <div className="text-xs uppercase text-ada-blue-400">Standard balance</div>
              <div className="mt-2 text-2xl font-semibold">{monthlyCredits.toLocaleString()}</div>
              <div className="text-sm text-ada-text-muted">credits this period</div>
            </div>
          </aside>
        </HudFrame>

        <section className="grid gap-4">
          <HudFrame tone="active" brackets>
            <div className="grid min-h-[34rem] grid-rows-[auto_1fr_auto] gap-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Image src={logoForModel(activeModel.id)} alt="" width={36} height={36} className="h-9 w-9 rounded-md bg-ada-surface-3 p-1.5" />
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold">Obsidian atelier</h1>
                    <p className="text-sm text-ada-text-muted">RUNNING · {progress}% · {activeModel.displayName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPrompt(`${prompt}\nDuplicate this direction with a new seed.`)}>
                    Duplicate
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={downloadPreview}>
                    Download
                  </Button>
                </div>
              </div>
              <div className="grid place-items-center rounded-md border border-[color:var(--color-ada-line-quiet)] bg-ada-void p-4">
                <Image
                  src={activeModel.previewAssetPath}
                  alt={prompt || 'Generated asset preview'}
                  width={960}
                  height={720}
                  priority
                  className="max-h-[52vh] w-full max-w-4xl rounded-md object-contain shadow-[var(--glow-3)] transition duration-[var(--dur-4)]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <textarea
                  rows={3}
                  className="min-h-24 resize-none rounded-md border border-[color:var(--color-ada-line)] bg-ada-surface-2 p-3 text-sm outline-none transition focus:border-ada-cyan-300"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <Button type="button" className="self-end" onClick={generateEdit}>
                  Generate edit
                </Button>
              </div>
            </div>
          </HudFrame>

          <HudFrame>
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">History</h2>
                <span className="font-mono text-xs text-ada-cyan-400">mock provider</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {history.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setActiveModelId(model.id)}
                    className="rounded-md border border-[color:var(--color-ada-line-quiet)] bg-ada-surface-2 p-2 text-left transition duration-[var(--dur-2)] hover:-translate-y-0.5 hover:border-[color:var(--color-ada-line-strong)]"
                  >
                    <Image
                      src={model.previewAssetPath}
                      alt={`${model.displayName} generated asset`}
                      width={320}
                      height={240}
                      className="aspect-[4/3] w-full rounded object-cover"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Image src={logoForModel(model.id)} alt="" width={18} height={18} className="h-4.5 w-4.5" />
                      <span className="truncate text-sm">{model.displayName}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </HudFrame>
        </section>

        <HudFrame className="lg:min-h-[calc(100vh-2rem)]">
          <aside className="grid content-start gap-5 p-4">
            <div>
              <h2 className="text-lg font-semibold">Inspector</h2>
              <p className="text-sm text-ada-text-muted">Current generation settings and edit thread.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setActiveModelId(model.id)}
                  className={`rounded-md border p-2 text-left transition duration-[var(--dur-2)] hover:bg-ada-surface-2 ${model.id === activeModel.id ? 'border-ada-blue-500 bg-ada-surface-2' : 'border-[color:var(--color-ada-line-quiet)]'}`}
                >
                  <Image src={logoForModel(model.id)} alt="" width={24} height={24} className="mb-2 h-6 w-6" />
                  <div className="truncate text-xs font-medium">{model.displayName}</div>
                </button>
              ))}
            </div>
            <dl className="grid gap-3 text-sm">
              <InspectorRow label="Model" value={activeModel.displayName} />
              <InspectorRow label="Kind" value={activeModel.kind} />
              <InspectorRow label="Tier" value={formatTier(activeModel.tier)} />
              <InspectorRow label="Cost" value={`${activeModel.priceCredits.toLocaleString()} credits`} />
              <InspectorRow label="Duration" value="5 seconds" />
              <InspectorRow label="Aspect" value="16:9" />
            </dl>
            <div className="grid gap-3">
              <ChatBubble role="user" text="Make the material read more like polished obsidian." />
              <ChatBubble role="assistant" text="Queued an edit pass with stronger rim highlights and less fog." />
              <ChatBubble role="user" text="Keep the product centered and make the motion more deliberate." />
            </div>
          </aside>
        </HudFrame>
      </div>
    </main>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[color:var(--color-ada-line-quiet)] pb-2">
      <dt className="text-ada-text-muted">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}

function ChatBubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  return (
    <div className={`rounded-md border p-3 text-sm ${role === 'user' ? 'border-ada-blue-500 bg-ada-surface-2' : 'border-[color:var(--color-ada-line-quiet)] bg-transparent text-ada-text-muted'}`}>
      <div className="mb-1 font-mono text-xs uppercase text-ada-blue-400">{role}</div>
      {text}
    </div>
  );
}
