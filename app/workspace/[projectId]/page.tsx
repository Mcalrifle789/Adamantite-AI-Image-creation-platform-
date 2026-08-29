import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { MODELS } from '@/config/models';
import { PLANS } from '@/config/plans';
import { WorkspaceApp } from '@/components/workspace/WorkspaceApp';
import type { PublicModelCard } from '@/components/model/brandAssets';
import { getCurrentAccount } from '@/lib/server/auth/accounts';
import { signInRedirect, workspacePath } from '@/lib/shared/authRedirect';

export const metadata: Metadata = {
  title: 'Workspace — Adamantite Agent',
  description: 'Create images and video with every leading model.',
};

// The session cookie is read per request, so this page can never be statically prerendered.
export const dynamic = 'force-dynamic';

const models: PublicModelCard[] = MODELS.map((model) => ({
  id: model.id,
  displayName: model.displayName,
  kind: model.kind,
  tier: model.tier,
  priceCredits: model.priceCredits,
  previewAssetPath: model.previewAssetPath,
  featured: model.featured,
}));

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ model?: string; prompt?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);

  // Creating costs credits, and credits belong to an account — so the studio is account-only.
  // Guarding on the server means a signed-out visitor never sees the workspace shell at all,
  // and `next` carries their model and prompt back after they sign in (their attached
  // references survive separately, in sessionStorage).
  const account = await getCurrentAccount();
  if (!account) redirect(signInRedirect(workspacePath(projectId, query)));

  const initialModelId = models.some((model) => model.id === query.model)
    ? query.model!
    : 'kling-2-5';
  const initialPrompt = query.prompt ?? '';

  // The credit balance is the *account's* plan allowance, not a fixed number. Previously this
  // was hard-coded to `PLANS.standard`, so every visitor — signed in on any plan, or signed out
  // entirely — was shown Standard's 79,950.
  const plan = PLANS[account.plan_id] ?? PLANS.port;

  return (
    <WorkspaceApp
      models={models}
      initialModelId={initialModelId}
      initialPrompt={initialPrompt}
      projectId={projectId}
      accountId={account.id}
      planName={plan.name}
      monthlyCredits={plan.monthlyCredits}
    />
  );
}
