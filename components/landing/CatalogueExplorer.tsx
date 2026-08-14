'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { formatTier, type PublicModelCard } from '@/components/model/brandAssets';

type KindFilter = 'all' | 'image' | 'video';

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
];

export function CatalogueExplorer({ models }: { models: PublicModelCard[] }) {
  const [kind, setKind] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((model) => {
      if (kind !== 'all' && model.kind !== kind) return false;
      if (q && !model.displayName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [models, kind, query]);

  return (
    <div className="glass-panel p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">Full catalogue</h2>
          <p className="mt-1 text-sm text-ada-text-muted">Every model available in your workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setKind(filter.id)}
                aria-pressed={kind === filter.id}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition duration-[var(--dur-2)] ${
                  kind === filter.id
                    ? 'bg-[rgb(34_211_238_/_0.16)] text-ada-cyan-100 shadow-[0_0_14px_-4px_rgb(34_211_238_/_0.85)]'
                    : 'text-ada-text-muted hover:text-ada-text'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models…"
            aria-label="Search models"
            className="h-9 w-40 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-ada-text outline-none transition placeholder:text-ada-text-muted/70 focus:border-ada-cyan-300/50"
          />
        </div>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((model) => (
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
      ) : (
        <p className="rounded-2xl border border-dashed border-white/12 px-4 py-10 text-center text-sm text-ada-text-muted">
          No models match “{query}”.
        </p>
      )}
    </div>
  );
}
