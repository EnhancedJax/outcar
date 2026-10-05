import type { Place } from "@/types/place"
import { GpsIcon } from "@phosphor-icons/react"

import { ParkingConditionChip } from "@/components/parking-condition-chip"
import SelectedPlaceControls from "./controls"

export default function SelectedPlaceHeader({
  selectedPlace,
}: {
  selectedPlace: Place
}) {
  return (
    <div className="flex flex-row px-6 text-center lg:flex-col">
      <div className="pointer-events-auto flex w-full flex-col lg:items-center">
        <h2 className="text-left text-lg font-medium">{selectedPlace.name}</h2>
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
      </div>
      <div className="lg:hidden">
        <SelectedPlaceControls selectedPlace={selectedPlace} />
      </div>
    </div>
  )
}
