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
    <div className="flex flex-row gap-2 px-6 lg:flex-col lg:text-center">
      <div className="pointer-events-auto flex w-full flex-col lg:items-center">
        <h2 className="text-lg font-medium">{selectedPlace.name}</h2>
        <div className="flex w-full flex-wrap gap-1 text-muted-foreground lg:items-center">
          <div
            className="flex items-center text-xs"
            // onClick={(e) => {
            //   e.stopPropagation()
            //   navigator.clipboard.writeText(
            //     `${selectedPlace.latitude.toFixed(6)}, ${selectedPlace.longitude.toFixed(6)}`
            //   )
            // }}
          >
            <GpsIcon className="mr-1 shrink-0" size={14} />
            <span>
              {selectedPlace.latitude.toFixed(6)},{" "}
              {selectedPlace.longitude.toFixed(6)}
            </span>
          </div>
          <ParkingConditionChip value={selectedPlace.parkingCondition} />
        </div>
      </div>
      <div className="lg:hidden">
        <SelectedPlaceControls selectedPlace={selectedPlace} />
      </div>
    </div>
  )
}
