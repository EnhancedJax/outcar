const BLUR_BANDS = [
  { blur: 1, from: 0, to: 28 },
  { blur: 2, from: 8, to: 40 },
  { blur: 4, from: 18, to: 52 },
  { blur: 8, from: 30, to: 64 },
  { blur: 16, from: 42, to: 76 },
  { blur: 28, from: 54, to: 88 },
  { blur: 48, from: 66, to: 100 },
] as const

function bandMask(from: number, to: number, direction: "down" | "up") {
  const span = to - from
  const fadeIn = from + span * 0.4
  const axis = direction === "down" ? "to bottom" : "to top"

  if (to >= 100) {
    return `linear-gradient(${axis}, transparent ${from}%, black ${fadeIn}%, black 100%)`
  }

  const fadeOut = Math.min(to + span * 0.35, 100)

  return `linear-gradient(${axis}, transparent ${from}%, black ${fadeIn}%, black ${to}%, transparent ${fadeOut}%)`
}

export function ProgressiveBlur({ direction }: { direction: "down" | "up" }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {BLUR_BANDS.map((band) => (
        <div
          key={band.blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${band.blur}px) saturate(1.25)`,
            WebkitBackdropFilter: `blur(${band.blur}px) saturate(1.25)`,
            maskImage: bandMask(band.from, band.to, direction),
            WebkitMaskImage: bandMask(band.from, band.to, direction),
          }}
        />
      ))}
    </div>
  )
}
