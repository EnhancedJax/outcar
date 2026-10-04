import { createPlaceId } from "@/lib/places"
import { isValidGmapUrl, isValidParkingCondition } from "@/types/place"
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
  parkingCondition: string
  gmapUrl: string
}

export function toDraft(place: Place): DraftPlace {
  return {
    id: place.id,
    name: place.name,
    note: place.note,
    longitude: String(place.longitude),
    latitude: String(place.latitude),
    tags: [...place.tags],
    parkingCondition: String(place.parkingCondition),
    gmapUrl: place.gmapUrl ?? "",
  }
}

export function fromDraft(draft: DraftPlace): Place | null {
  const longitude = Number(draft.longitude)
  const latitude = Number(draft.latitude)
  const parkingCondition = Number(draft.parkingCondition)
  const gmapUrl = draft.gmapUrl.trim()

  if (
    !draft.id.trim() ||
    !draft.name.trim() ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    !isValidParkingCondition(parkingCondition) ||
    (gmapUrl !== "" && !isValidGmapUrl(gmapUrl))
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
    parkingCondition,
    gmapUrl: gmapUrl === "" ? null : gmapUrl,
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
      parkingCondition: -1,
      gmapUrl: null,
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
