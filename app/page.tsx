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
  badges: model.badges,
})).sort((a, b) => a.displayName.localeCompare(b.displayName));
const featuredModels = allModels.filter((model) => model.featured);

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 pb-20 text-ada-text sm:px-8 lg:px-12">
      {/* ── Top navigation ─────────────────────────────────────────────── */}
      <nav className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 py-6">
        <Link href="/" aria-label="Adamantite Agent home" className="inline-flex items-center">
          <Wordmark size="header" withAgent={false} as="span" className="text-2xl" />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="#full-catalogue"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ada-text-muted transition hover:text-ada-text sm:inline-flex"
          >
            Models
          </Link>
          <Link
            href="/pricing"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ada-text-muted transition hover:text-ada-text sm:inline-flex"
          >
            Pricing
          </Link>
          <Link
            href="/pricing"
            className="group inline-flex items-center gap-2 rounded-full border border-ada-cyan-300/45 bg-[rgb(34_211_238_/_0.08)] px-5 py-2 text-sm font-semibold text-ada-cyan-100 shadow-[0_0_24px_-8px_rgb(34_211_238_/_0.9)] backdrop-blur-md transition duration-[var(--dur-2)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-ada-cyan-300/70 hover:bg-[rgb(34_211_238_/_0.16)] hover:shadow-[0_0_34px_-6px_rgb(34_211_238_/_0.95)]"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ada-cyan-300 shadow-[0_0_10px_2px_rgb(34_211_238_/_0.9)]" />
            Upgrade
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-[92rem] flex-col items-center">
        <header className="mb-12 mt-10 w-full text-center sm:mt-16">
          <h1 className="sr-only">Adamantite Agent</h1>
          <Wordmark size="hero" withAgent as="span" />
          <p className="mx-auto mt-7 max-w-xl text-balance text-base text-ada-text-muted sm:text-lg">
            A luxury creative studio for AI image &amp; video — every leading model, one refined workspace.
          </p>
        </header>

        <ModelSelector featuredModels={featuredModels} allModels={allModels} />
      </section>

      {/* ── Full catalogue — target of the "More models" chevron ───────── */}
      <section id="full-catalogue" className="mx-auto mt-24 w-full max-w-[80rem] scroll-mt-8">
        <div className="glass-panel p-6 sm:p-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">Full catalogue</h2>
              <p className="mt-1 text-sm text-ada-text-muted">Every model available in your workspace.</p>
            </div>
            <span className="font-mono text-xs text-ada-text-muted">{allModels.length} models</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {allModels.map((model) => (
              <Link
                key={model.id}
                href={`/workspace/demo?model=${encodeURIComponent(model.id)}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[rgb(12_18_34_/_0.5)] px-4 py-3.5 transition duration-[var(--dur-2)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-ada-cyan-300/50 hover:bg-[rgb(16_24_44_/_0.7)] hover:shadow-[0_0_30px_-12px_rgb(40_170_255_/_0.8)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ada-text">{model.displayName}</div>
                  <div className="mt-0.5 text-xs uppercase tracking-wide text-ada-cyan-200/55">
                    {formatTier(model.tier)} · {model.kind}
                  </div>
                </div>
                <span aria-hidden className="text-ada-cyan-200/40 transition group-hover:translate-x-0.5 group-hover:text-ada-cyan-200">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
