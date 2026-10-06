import { useMemo } from "react"

import { useAppState } from "@/app-state"
import { ProgressiveBlur } from "@/components/progressive-blur"
import SelectedPlaceHeader from "./header"
import SelectedPlaceImages from "./images"

import SelectedPlaceBody from "./body"
import SelectedPlaceControls from "./controls"

export function SelectedPlace() {
  const { displayPlaces, selectedPlaceId, viewerMode } = useAppState()

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
      <div className="relative flex w-full flex-row gap-4 pt-28 pb-6 lg:flex-col">
        <div className="flex-1">
          <SelectedPlaceImages selectedPlace={selectedPlace} />
          <SelectedPlaceHeader selectedPlace={selectedPlace} />
          <SelectedPlaceBody selectedPlace={selectedPlace} />
        </div>

        <SelectedPlaceControls selectedPlace={selectedPlace} />
      </div>
    </div>
  )
}
