import { ArrowLeft, NavigationArrow } from "@phosphor-icons/react"
import { cn } from "cn"
import { useMemo } from "react"

import { useAppState } from "@/app-state"
import { TagChip } from "@/components/tag-chip"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { catalogTagById } from "@/types/place"

const NAVIGATION_APPS = [
  {
    id: "apple-maps",
    label: "Apple Maps",
    href: (latitude: number, longitude: number) =>
      `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
  },
  {
    id: "google-maps",
    label: "Google Maps",
    href: (latitude: number, longitude: number) =>
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`,
  },
  {
    id: "waze",
    label: "Waze",
    href: (latitude: number, longitude: number) =>
      `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
  },
  {
    id: "amap",
    label: "Amap",
    href: (latitude: number, longitude: number, name: string) => {
      const destination = `${longitude},${latitude},${encodeURIComponent(name)}`

      return `https://uri.amap.com/navigation?to=${destination}&mode=car&coordinate=wgs84&callnative=1&src=outcar`
    },
  },
] as const

const frostedButtonClassName =
  "h-9 rounded-full bg-foreground/10 px-5 backdrop-blur-md hover:bg-foreground/20"

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
  const { displayPlaces, selectedPlaceId, tags, viewerMode, selectPlace } =
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
              {selectedPlace.tags.map((tagId) => {
                const catalogTag = catalogTagById(tags, tagId)

                if (!catalogTag) {
                  return null
                }

                return (
                  <span
                    key={tagId}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    <TagChip catalogTag={catalogTag} />
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>
        <div className="pointer-events-auto mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-full bg-foreground/10 px-5 backdrop-blur-md hover:bg-foreground/20"
            aria-label="Dismiss place details"
            onClick={() => selectPlace(null)}
          >
            <ArrowLeft weight="bold" />
          </Button>
          <Popover>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                frostedButtonClassName
              )}
            >
              <NavigationArrow weight="bold" />
              Navigate
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="w-52 p-2">
              <PopoverHeader className="px-2 pt-1 pb-2">
                <PopoverTitle className="text-xs">Navigate</PopoverTitle>
                <PopoverDescription className="text-xs">
                  Open directions in
                </PopoverDescription>
              </PopoverHeader>
              <div className="flex flex-col gap-0.5">
                {NAVIGATION_APPS.map((app) => {
                  const href =
                    app.id === "amap"
                      ? app.href(
                          selectedPlace.latitude,
                          selectedPlace.longitude,
                          selectedPlace.name
                        )
                      : app.href(
                          selectedPlace.latitude,
                          selectedPlace.longitude
                        )

                  return (
                    <a
                      key={app.id}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {app.label}
                    </a>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
