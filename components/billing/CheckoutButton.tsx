'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { WalletPlan } from './wallet';

interface CheckoutButtonProps {
  plan: WalletPlan;
  featured?: boolean;
}

export function CheckoutButton({ plan, featured = false }: CheckoutButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const payload = (await response.json()) as { url?: string; error?: { message?: string } };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error?.message ?? 'Stripe checkout is not configured yet.');
      }

      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Stripe checkout could not be started.');
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 grid gap-2">
      <Button type="button" onClick={subscribe} variant={featured ? 'primary' : 'secondary'} loading={loading}>
        Choose {plan.name}
      </Button>
      {message ? <p className="text-xs text-ada-danger" role="status">{message}</p> : null}
    </div>
  );
}
