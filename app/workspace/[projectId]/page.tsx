import { MODELS } from '@/config/models';
import { PLANS } from '@/config/plans';
import { WorkspaceApp } from '@/components/workspace/WorkspaceApp';
import type { PublicModelCard } from '@/components/model/brandAssets';

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
  const initialModelId = models.some((model) => model.id === query.model)
    ? query.model!
    : 'kling-2-5';
  const initialPrompt =
    query.prompt ??
    'Refine the glass edges, keep the blue rain reflections, and render a slower camera move.';

  return (
    <WorkspaceApp
      models={models}
      initialModelId={initialModelId}
      initialPrompt={initialPrompt}
      projectId={projectId}
      monthlyCredits={PLANS.standard.monthlyCredits}
    />
  );
}
