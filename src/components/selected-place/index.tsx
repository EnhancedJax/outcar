import { useMemo } from "react"

import { useAppState } from "@/app-state"
import { ProgressiveBlur } from "@/components/progressive-blur"
import SelectedPlaceHeader from "./header"
import SelectedPlaceImages from "./images"

import { TagChip } from "@/components/tag-chip"
import { catalogTagById } from "@/types/place"
import SelectedPlaceControls from "./controls"

export function SelectedPlace() {
  const { tags, displayPlaces, selectedPlaceId, viewerMode } = useAppState()

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
      <div className="relative w-full pt-28 pb-6">
        <SelectedPlaceImages selectedPlace={selectedPlace} />

        <SelectedPlaceHeader selectedPlace={selectedPlace} />

        <div className="mt-4 flex flex-col gap-4 px-6 text-left lg:text-center">
          {selectedPlace.note ? (
            <p className="ml-0.5 text-sm">{selectedPlace.note}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 lg:justify-center">
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
          <div className="hidden lg:flex lg:justify-center">
            <SelectedPlaceControls selectedPlace={selectedPlace} />
          </div>
        </div>
      </div>
    </div>
  )
}
