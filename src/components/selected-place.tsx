import {
  ArrowLeft,
  ChatTeardropTextIcon,
  GpsIcon,
  NavigationArrow,
  PersonIcon,
} from "@phosphor-icons/react"
import { cn } from "cn"
import { useMemo } from "react"

import { useAppState } from "@/app-state"
import { ParkingConditionChip } from "@/components/parking-condition-chip"
import { ProgressiveBlur } from "@/components/progressive-blur"
import { TagChip } from "@/components/tag-chip"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { gmapStreetViewUrl, NAVIGATION_APPS } from "@/lib/urls"
import { catalogTagById } from "@/types/place"

const frostedButtonClassName =
  "lg:h-9 rounded-full bg-foreground/10 lg:px-5 p-2 backdrop-blur-md hover:bg-foreground/20"

export function SelectedPlace() {
  const {
    displayPlaces,
    selectedPlaceId,
    tags,
    viewerMode,
    selectPlace,
    selectedPlaceImages,
    selectedPlaceImagesLoading,
    selectedPlaceImagesError,
  } = useAppState()

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
      <ProgressiveBlur direction="down" />
      <div className="relative flex w-full flex-row px-6 pt-28 pb-6 text-center lg:flex-col">
        <div className="pointer-events-auto flex w-full flex-col lg:items-center">
          {selectedPlaceImagesLoading ? (
            <div
              className="mb-3 h-40 w-full animate-pulse rounded-lg bg-muted lg:max-w-md"
              aria-label="Loading place image"
            />
          ) : selectedPlaceImages[0] ? (
            <img
              src={selectedPlaceImages[0].dataUrl}
              alt={selectedPlace.name}
              className="mb-3 max-h-56 w-full rounded-lg object-cover lg:max-w-md"
            />
          ) : selectedPlaceImagesError ? (
            <p className="mb-3 text-xs text-destructive">
              {selectedPlaceImagesError}
            </p>
          ) : null}
          <h2 className="text-left text-lg font-medium">
            {selectedPlace.name}
          </h2>
          <div className="flex text-muted-foreground lg:items-center">
            <GpsIcon className="mr-1" />
            <span className="text-xs">
              {selectedPlace.latitude.toFixed(6)},{" "}
              {selectedPlace.longitude.toFixed(6)}
            </span>
            <ParkingConditionChip
              value={selectedPlace.parkingCondition}
              className="ml-2"
            />
          </div>
          {selectedPlace.note ? (
            <div className="mt-2 flex items-center gap-1">
              <ChatTeardropTextIcon className="text-muted-foreground" />
              <p className="text-sm">{selectedPlace.note}</p>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-1.5">
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
        </div>
        <div className="pointer-events-auto flex gap-2 lg:mt-4 lg:items-center lg:justify-center">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className={frostedButtonClassName}
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
              <NavigationArrow weight="fill" />
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="w-52 p-2">
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
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className={frostedButtonClassName}
            onClick={() => {
              window.open(
                gmapStreetViewUrl(
                  selectedPlace.latitude,
                  selectedPlace.longitude
                ),
                "_blank"
              )
            }}
          >
            <PersonIcon weight="fill" />
          </Button>
        </div>
      </div>
    </div>
  )
}
