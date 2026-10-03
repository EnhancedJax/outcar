import { createPlaceId } from "@/lib/places"
import { tagKey } from "@/types/place"
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

export type PlaceFormValues = {
  id: string
  name: string
  note: string
  longitude: string
  latitude: string
}

export function toDraft(place: Place): DraftPlace {
  return {
    id: place.id,
    name: place.name,
    note: place.note,
    longitude: String(place.longitude),
    latitude: String(place.latitude),
    tags: [...place.tags],
  }
}

export function fromDraft(draft: DraftPlace): Place | null {
  const longitude = Number(draft.longitude)
  const latitude = Number(draft.latitude)

  if (
    !draft.id.trim() ||
    !draft.name.trim() ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null
  }

  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    note: draft.note,
    longitude,
    latitude,
    tags: draft.tags,
  }
}

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
    }))
}

export function toggleDraftTag(draft: DraftPlace, tag: string): DraftPlace {
  const key = tagKey(tag)
  const hasTag = draft.tags.some((item) => tagKey(item) === key)

  return {
    ...draft,
    tags: hasTag
      ? draft.tags.filter((item) => tagKey(item) !== key)
      : [...draft.tags, tag],
  }
}
