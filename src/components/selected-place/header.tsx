import type { Place } from "@/types/place"
import { ChatTeardropTextIcon, GpsIcon } from "@phosphor-icons/react"

import { ParkingConditionChip } from "@/components/parking-condition-chip"
import { TagChip } from "@/components/tag-chip"
import { catalogTagById } from "@/types/place"

import { useAppState } from "@/app-state"

export default function SelectedPlaceHeader({
  selectedPlace,
}: {
  selectedPlace: Place
}) {
  const { tags } = useAppState()

  return (
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
  )
}
