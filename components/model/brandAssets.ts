import type { MediaKind, ModelTier } from '@/lib/shared/api-types';

export interface PublicModelCard {
  id: string;
  displayName: string;
  kind: MediaKind;
  tier: ModelTier;
  priceCredits: number;
  previewAssetPath: string;
  featured: boolean;
  /** Marketing badges (e.g. 'latest', 'fast'); optional so non-landing callers can omit it. */
  badges?: string[];
}

export function logoForModel(modelId: string): string {
  switch (modelId) {
    case 'nano-banana-2':
      return '/brand/model-logos/gemini.svg';
    case 'gpt-image-2':
      return '/brand/model-logos/openai.svg';
    case 'kling-2-5':
      return '/brand/model-logos/kling.svg';
    case 'seedance-2-5':
    case 'wan-2-5':
      return '/brand/model-logos/alibaba.svg';
    case 'grok-image-1':
      return '/brand/model-logos/grok.svg';
    case 'flux-schnell':
      return '/brand/model-logos/flux.svg';
    case 'sdxl-turbo':
      return '/brand/model-logos/stability.svg';
    case 'imagen-4-ultra':
    case 'veo-3-1':
      return '/brand/model-logos/google.svg';
    case 'midjourney-7':
      return '/brand/model-logos/midjourney.svg';
    case 'hailuo-02':
      return '/brand/model-logos/minimax.svg';
    default:
      return '/app/icon.svg';
  }
}

export function formatTier(tier: string): string {
  return tier.replace('_', ' ');
}
