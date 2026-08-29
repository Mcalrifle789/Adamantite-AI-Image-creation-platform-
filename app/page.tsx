import Link from 'next/link';

import { MODELS } from '@/config/models';
import { AccountMenu } from '@/components/account/AccountMenu';
import { Wordmark } from '@/components/brand/Wordmark';
import { CatalogueExplorer } from '@/components/landing/CatalogueExplorer';
import { ModelSelector } from '@/components/landing/ModelSelector';
import type { PublicModelCard } from '@/components/model/brandAssets';

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
      {/* Sticky frosted chrome. `top-4` + the pill radius makes it read as a floating bar over
          the aurora rather than a band welded to the viewport edge. */}
      <nav className="glass-bar glass-sheen sticky top-4 z-30 mx-auto mt-4 flex max-w-[92rem] items-center justify-between gap-4 py-3 pl-5 pr-3">
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
          {/* The identity control replaces the old always-visible "Upgrade" pill: signed out it
              offers Sign in / Create account, signed in it becomes the profile menu. */}
          <AccountMenu />
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-[92rem] flex-col items-center">
        <header className="mb-12 mt-10 w-full text-center sm:mt-16">
          <h1 className="sr-only">Adamantite Agent</h1>
          <Wordmark size="hero" withAgent as="span" />
          {/* Spectral. The one long sentence on the page, and the only place the brand makes a
              claim in words — a text serif carries "luxury studio" where a grotesque cannot. */}
          <p className="prose-editorial mx-auto mt-7 max-w-xl text-balance text-lg text-ada-text-muted sm:text-xl">
            A luxury creative studio for AI image &amp; video — every leading model, one refined workspace.
          </p>
        </header>

        <ModelSelector featuredModels={featuredModels} allModels={allModels} />
      </section>

      {/* ── Full catalogue — target of the "More models" chevron ───────── */}
      <section id="full-catalogue" className="mx-auto mt-24 w-full max-w-[80rem] scroll-mt-8">
        <CatalogueExplorer models={allModels} />
      </section>
    </main>
  );
}
