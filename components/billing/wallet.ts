'use client';

import type { PlanAccent, PlanId } from '@/lib/shared/api-types';

export const WALLET_STORAGE_KEY = 'ada.ownerWallet.entries';

export interface WalletPlan {
  id: PlanId;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  accent: PlanAccent;
}

export interface WalletEntry {
  id: string;
  planId: PlanId;
  planName: string;
  grossCents: number;
  ownerCents: number;
  providerCents: number;
  providerPoolCredits: number;
  createdAt: string;
  status: 'simulated';
}

export function createWalletEntry(plan: WalletPlan): WalletEntry {
  const ownerCents = Math.floor(plan.priceCents / 2);
  const providerCents = plan.priceCents - ownerCents;
  return {
    id: `wlt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    planId: plan.id,
    planName: plan.name,
    grossCents: plan.priceCents,
    ownerCents,
    providerCents,
    providerPoolCredits: providerCents * 100,
    createdAt: new Date().toISOString(),
    status: 'simulated',
  };
}

export function readWalletEntries(): WalletEntry[] {
  try {
    const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) return seedEntries();
    const parsed = JSON.parse(raw) as WalletEntry[];
    return Array.isArray(parsed) ? parsed : seedEntries();
  } catch {
    return seedEntries();
  }
}

export function writeWalletEntries(entries: WalletEntry[]) {
  window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(entries));
}

export function appendWalletEntry(entry: WalletEntry): WalletEntry[] {
  const entries = [entry, ...readWalletEntries()];
  writeWalletEntries(entries);
  window.dispatchEvent(new CustomEvent('ada-wallet-updated'));
  return entries;
}

export function seedEntries(): WalletEntry[] {
  return [
    {
      id: 'wlt_seed_standard',
      planId: 'standard',
      planName: 'Standard',
      grossCents: 1599,
      ownerCents: 799,
      providerCents: 800,
      providerPoolCredits: 80000,
      createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
      status: 'simulated',
    },
  ];
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
