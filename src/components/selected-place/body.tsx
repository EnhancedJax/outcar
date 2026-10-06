import type { Place } from "@/types/place"

import { useAppState } from "@/app-state"
import { catalogTagById } from "@/types/place"
import { TagChip } from "../tag-chip"

export default function SelectedPlaceBody({
  selectedPlace,
}: {
  selectedPlace: Place
}) {
  const { tags } = useAppState()

  return (
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
    </div>
  )
}
