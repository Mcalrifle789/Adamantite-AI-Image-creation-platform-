import Link from 'next/link';

import { MODELS } from '@/config/models';
import { PLANS } from '@/config/plans';
import { Wordmark } from '@/components/brand/Wordmark';
import { HudFrame } from '@/components/hud/HudFrame';
import { Button } from '@/components/ui/Button';
import { ModelSelector } from '@/components/landing/ModelSelector';
import { formatTier, type PublicModelCard } from '@/components/model/brandAssets';

const allModels: PublicModelCard[] = MODELS.map((model) => ({
  id: model.id,
  displayName: model.displayName,
  kind: model.kind,
  tier: model.tier,
  priceCredits: model.priceCredits,
  previewAssetPath: model.previewAssetPath,
  featured: model.featured,
})).sort((a, b) => a.displayName.localeCompare(b.displayName));
const featuredModels = allModels.filter((model) => model.featured);
const recentProjects = [
  { name: 'Chromium altar study', model: 'Nano Banana 2', status: 'Edited 12 min ago' },
  { name: 'Runway splash frames', model: 'Kling 2.5', status: '4 video passes' },
  { name: 'Blue glass product set', model: 'GPT-Image 2', status: '18 assets' },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden px-4 py-5 text-ada-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[var(--container-content)] flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Adamantite home" className="inline-flex">
            <Wordmark size="header" />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/pricing">Pricing</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/workspace/demo">Workspace</Link>
            </Button>
          </nav>
        </header>

        <section className="grid min-h-[calc(100vh-8rem)] items-start gap-8 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:pt-20">
          <div className="space-y-7 lg:pt-28">
            <Wordmark size="hero" withAgent />
            <p className="max-w-[36rem] text-lg text-ada-text-muted">
              A darkroom for fast image and 5-second video generation, with model choice,
              credits, prompt history and edit-chat designed as one working surface.
            </p>
          </div>

          <div className="grid gap-4">
            <ModelSelector featuredModels={featuredModels} allModels={allModels} />
            <HudFrame>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ada-text">Full catalogue</h2>
                  <span className="font-mono text-xs text-ada-text-muted">{allModels.length} models</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  {allModels.map((model) => (
                    <div key={model.id} className="rounded-md border border-[color:var(--color-ada-line-quiet)] bg-ada-surface-2 px-3 py-2">
                      <div className="truncate text-ada-text">{model.displayName}</div>
                      <div className="text-xs text-ada-text-muted">{formatTier(model.tier)} · {model.kind}</div>
                    </div>
                  ))}
                </div>
              </div>
            </HudFrame>
          </div>
        </section>

        <section className="grid gap-4 pb-10 lg:grid-cols-[1.2fr_0.8fr]">
          <HudFrame>
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent projects</h2>
                <Link href="/workspace/demo" className="text-sm text-ada-cyan-400">Open all</Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {recentProjects.map((project) => (
                  <div key={project.name} className="rounded-md border border-[color:var(--color-ada-line-quiet)] bg-ada-surface-2 p-3">
                    <div className="font-medium">{project.name}</div>
                    <div className="mt-2 text-xs text-ada-text-muted">{project.model}</div>
                    <div className="mt-1 font-mono text-xs text-ada-blue-400">{project.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </HudFrame>
          <HudFrame>
            <div className="grid gap-2 p-4">
              <h2 className="text-sm font-semibold">Current plan</h2>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold">{PLANS.standard.name}</div>
                  <div className="text-sm text-ada-text-muted">{PLANS.standard.monthlyCredits.toLocaleString()} monthly credits</div>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/pricing">Compare</Link>
                </Button>
              </div>
            </div>
          </HudFrame>
        </section>
      </div>
    </main>
  );
}
