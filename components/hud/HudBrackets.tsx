import type { Corner } from '../ui/utils';

export interface HudBracketsProps {
  /** Corners to place an L-bracket accent on — ux-patterns.md §5: "the two corners the chamfer
   * does not cut". `HudFrame` passes the complement of its own `corners` prop. */
  corners: Corner[];
}

const ARM = 28; // px, ux-patterns.md §5
const THICKNESS = 1.5; // px

const POSITION_STYLE: Record<Corner, { top?: number; bottom?: number; left?: number; right?: number }> = {
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
};

/** 28px, 1.5px thick, `cyan-400` at 0.55 alpha L-shaped corner accents. */
export function HudBrackets({ corners }: HudBracketsProps) {
  return (
    <>
      {corners.map((corner) => {
        const position = POSITION_STYLE[corner];
        return (
          <span key={corner} aria-hidden="true" className="pointer-events-none absolute" style={{ ...position, width: ARM, height: ARM }}>
            <span
              className="absolute bg-ada-cyan-400/55"
              style={{ ...horizontalStyle(corner), width: ARM, height: THICKNESS }}
            />
            <span
              className="absolute bg-ada-cyan-400/55"
              style={{ ...verticalStyle(corner), width: THICKNESS, height: ARM }}
            />
          </span>
        );
      })}
    </>
  );
}

function horizontalStyle(corner: Corner): { top?: number; bottom?: number; left?: number; right?: number } {
  return corner === 'tl' || corner === 'tr' ? { top: 0, left: 0 } : { bottom: 0, left: 0 };
}

function verticalStyle(corner: Corner): { top?: number; bottom?: number; left?: number; right?: number } {
  return corner === 'tl' || corner === 'bl' ? { top: 0, left: 0 } : { top: 0, right: 0 };
}
