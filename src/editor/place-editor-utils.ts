import { createPlaceId } from "@/lib/places"
import type { DraftPlace, Place } from "@/types/place"

export type ImportPreviewItem = {
  key: string
  name: string
  note: string
  longitude: number
  latitude: number
  selected: boolean
  alreadyExists: boolean
}

export type EditorTab = "places" | "tags" | "import" | "search"

export type PlacesScreen = "list" | "form"

export function importPreviewToPlaces(items: ImportPreviewItem[]): Place[] {
  return items
    .filter((item) => item.selected && !item.alreadyExists)
    .map((item, index) => ({
      id: `import-preview-${index}-${createPlaceId(item.name)}`,
      name: item.name,
      note: item.note,
      longitude: item.longitude,
      latitude: item.latitude,
      tags: [],
      parkingCondition: -1,
      gmapUrl: null,
      pathType: -1,
      path: [],
      images: [],
    }))
}

export function toggleDraftTag(draft: DraftPlace, tagId: string): DraftPlace {
  const hasTag = draft.tags.includes(tagId)

  return {
    ...draft,
    tags: hasTag
      ? draft.tags.filter((item) => item !== tagId)
      : [...draft.tags, tagId],
  }
}
