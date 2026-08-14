import Link from 'next/link';

import { MODELS } from '@/config/models';
import { Wordmark } from '@/components/brand/Wordmark';
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

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 pb-16 pt-6 text-ada-text sm:px-6 lg:px-10">
      {/* Upgrade — top-right, matching the landing mockup */}
      <div className="absolute right-4 top-6 z-20 sm:right-6 lg:right-10">
        <Link
          href="/pricing"
          className="neon-input inline-flex h-11 items-center px-6 text-lg font-medium text-ada-text"
        >
          Upgrade
        </Link>
      </div>

      <div className="relative mx-auto flex max-w-[112rem] flex-col items-center gap-10 sm:gap-12">
        <header className="mt-6 w-full text-center sm:mt-8">
          <h1 className="sr-only">Adamantite Agent</h1>
          <Wordmark size="hero" withAgent as="span" />
        </header>

        <ModelSelector featuredModels={featuredModels} allModels={allModels} />
      </div>

      {/* Full catalogue — target of the "More models" arrow */}
      <section id="full-catalogue" className="mx-auto mt-16 w-full max-w-[92rem] scroll-mt-8">
        <div className="neon-frame p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ada-text">Full catalogue</h2>
            <span className="font-mono text-xs text-ada-text-muted">{allModels.length} models</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {allModels.map((model) => (
              <Link
                key={model.id}
                href={`/workspace/demo?model=${encodeURIComponent(model.id)}`}
                className="rounded-[14px] border border-[rgb(90_178_255_/_0.28)] bg-[rgb(6_12_24_/_0.6)] px-4 py-3 transition duration-[var(--dur-2)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[rgb(120_205_255_/_0.7)] hover:shadow-[0_0_24px_-8px_rgb(40_170_255_/_0.7)]"
              >
                <div className="truncate text-sm font-medium text-ada-text">{model.displayName}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-ada-blue-400">
                  {formatTier(model.tier)} · {model.kind}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
