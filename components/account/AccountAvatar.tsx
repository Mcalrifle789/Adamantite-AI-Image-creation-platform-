'use client';

import { cn } from '@/components/ui/utils';

export interface AccountAvatarProps {
  initials: string;
  /** Seeds the hue ramp so one account always renders the same colour. */
  seed: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-[0.7rem]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-16 w-16 text-lg',
} as const;

/**
 * The monogram avatar. There is no photo upload in this build, so identity is carried by the
 * initials plus a stable hue derived from the account id — the same account is the same colour
 * on every device, which is what makes the header recognisable at a glance.
 */
function hueFromSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  // Constrained to the brand's blue→cyan→violet arc; a stray green or amber would read as a
  // different product.
  return 185 + (hash % 80);
}

export function AccountAvatar({ initials, seed, size = 'md', className }: AccountAvatarProps) {
  const hue = hueFromSeed(seed);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase tracking-wide text-white',
        'border border-white/20 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.25)]',
        SIZE_CLASSES[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(150deg, hsl(${hue} 88% 58%) 0%, hsl(${hue - 30} 82% 38%) 100%)`,
        boxShadow: `0 0 18px -6px hsl(${hue} 90% 60% / 0.8)`,
      }}
    >
      {initials}
    </span>
  );
}
