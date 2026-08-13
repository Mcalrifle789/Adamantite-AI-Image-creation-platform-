'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { appendWalletEntry, createWalletEntry, formatMoney, type WalletPlan } from './wallet';

interface CheckoutButtonProps {
  plan: WalletPlan;
  featured?: boolean;
}

export function CheckoutButton({ plan, featured = false }: CheckoutButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  function subscribe() {
    const entry = createWalletEntry(plan);
    appendWalletEntry(entry);
    setMessage(
      `${plan.name} simulated: ${formatMoney(entry.ownerCents)} to owner wallet, ${formatMoney(entry.providerCents)} to provider pool.`,
    );
  }

  return (
    <div className="mt-6 grid gap-2">
      <Button type="button" onClick={subscribe} variant={featured ? 'primary' : 'secondary'}>
        Choose {plan.name}
      </Button>
      {message ? <p className="text-xs text-ada-cyan-400" role="status">{message}</p> : null}
    </div>
  );
}
