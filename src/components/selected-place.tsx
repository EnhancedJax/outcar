import { ArrowLeft } from "@phosphor-icons/react"
import { useMemo } from "react"

import { useAppState } from "@/app-state"
import { Button } from "@/components/ui/button"

const BLUR_BANDS = [
  { blur: 1, from: 0, to: 28 },
  { blur: 2, from: 8, to: 40 },
  { blur: 4, from: 18, to: 52 },
  { blur: 8, from: 30, to: 64 },
  { blur: 16, from: 42, to: 76 },
  { blur: 28, from: 54, to: 88 },
  { blur: 48, from: 66, to: 100 },
] as const

function bandMask(from: number, to: number) {
  const span = to - from
  const fadeIn = from + span * 0.4

  if (to >= 100) {
    return `linear-gradient(to bottom, transparent ${from}%, black ${fadeIn}%, black 100%)`
  }

  const fadeOut = Math.min(to + span * 0.35, 100)

  return `linear-gradient(to bottom, transparent ${from}%, black ${fadeIn}%, black ${to}%, transparent ${fadeOut}%)`
}

function ProgressiveBlur() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {BLUR_BANDS.map((band) => (
        <div
          key={band.blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${band.blur}px) saturate(1.25)`,
            WebkitBackdropFilter: `blur(${band.blur}px) saturate(1.25)`,
            maskImage: bandMask(band.from, band.to),
            WebkitMaskImage: bandMask(band.from, band.to),
          }}
        />
      ))}
    </div>
  )
}

export function SelectedPlace() {
  const { displayPlaces, selectedPlaceId, viewerMode, selectPlace } =
    useAppState()

  const selectedPlace = useMemo(
    () => displayPlaces.find((place) => place.id === selectedPlaceId) ?? null,
    [displayPlaces, selectedPlaceId]
  )

  if (!viewerMode || !selectedPlace) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 w-full"
      role="dialog"
      aria-label={selectedPlace.name}
    >
      <ProgressiveBlur />
      <div className="relative flex w-full flex-col items-center px-6 pt-28 pb-6 text-center">
        <div className="pointer-events-auto flex w-full flex-col items-center gap-2">
          <h2 className="text-lg font-medium">{selectedPlace.name}</h2>
          {selectedPlace.note ? (
            <p className="text-sm text-muted-foreground">{selectedPlace.note}</p>
          ) : null}
          {selectedPlace.tags.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1.5">
              {selectedPlace.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="pointer-events-auto mt-4 h-9 rounded-full bg-foreground/10 px-5 backdrop-blur-md hover:bg-foreground/20"
          aria-label="Dismiss place details"
          onClick={() => selectPlace(null)}
        >
          <ArrowLeft weight="bold" />
        </Button>
      </div>
    </div>
  )
}
