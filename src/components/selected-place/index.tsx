import { useMemo } from "react"

import { useAppState } from "@/app-state"
import { ProgressiveBlur } from "@/components/progressive-blur"
import SelectedPlaceControls from "./controls"
import SelectedPlaceHeader from "./header"
import SelectedPlaceImages from "./images"

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
      <div className="relative w-full pt-28 pb-6">
        <SelectedPlaceImages selectedPlace={selectedPlace} />
        <div className="flex flex-row px-6 text-center lg:flex-col">
          <SelectedPlaceHeader selectedPlace={selectedPlace} />
          <SelectedPlaceControls selectedPlace={selectedPlace} />
        </div>
      </div>
    </div>
  )
}
