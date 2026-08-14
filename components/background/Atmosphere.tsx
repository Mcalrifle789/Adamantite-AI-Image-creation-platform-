/**
 * Ambient depth behind the whole interface — sits below the rain field (z-0) and the content
 * (z-10). Three stacked, GPU-cheap layers: a slow cyan/blue gradient fog, a fine particle-dust
 * field, and an edge vignette. All decorative, `pointer-events-none`, and motion-reduced under
 * `prefers-reduced-motion`.
 */
export function Atmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash so #05050A never reads as flat */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, rgb(14 30 60 / 0.55), transparent 55%),' +
            'radial-gradient(90% 60% at 12% 8%, rgb(10 40 80 / 0.35), transparent 60%),' +
            'radial-gradient(90% 60% at 88% 12%, rgb(30 20 70 / 0.28), transparent 60%)',
        }}
      />
      {/* drifting fog */}
      <div
        className="absolute inset-[-10%] motion-safe:animate-[ada-fog-drift_26s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(40% 50% at 30% 30%, rgb(34 160 235 / 0.14), transparent 70%),' +
            'radial-gradient(45% 55% at 72% 60%, rgb(70 110 255 / 0.12), transparent 70%)',
          filter: 'blur(30px)',
        }}
      />
      {/* fine dust — two tiled dot fields at different scales, slowly rising */}
      <div
        className="absolute inset-x-0 top-0 h-[200%] opacity-[0.5] motion-safe:animate-[ada-dust-float_40s_linear_infinite]"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 30%, rgb(150 220 255 / 0.6), transparent 60%),' +
            'radial-gradient(1px 1px at 70% 60%, rgb(120 190 255 / 0.5), transparent 60%),' +
            'radial-gradient(1.5px 1.5px at 45% 80%, rgb(180 235 255 / 0.45), transparent 60%),' +
            'radial-gradient(1px 1px at 85% 20%, rgb(120 200 255 / 0.5), transparent 60%)',
          backgroundSize: '340px 340px, 260px 260px, 420px 420px, 300px 300px',
        }}
      />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 40%, transparent 55%, rgb(2 3 8 / 0.55) 88%, rgb(2 3 8 / 0.8) 100%)',
        }}
      />
    </div>
  );
}
