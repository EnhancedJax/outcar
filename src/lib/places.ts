import { isParkingConditionValue } from "@/constants/parking"
import { isPathTypeValue } from "@/constants/path"
import placesCsv from "@/data/places.csv?raw"
import tagsCsv from "@/data/tags.csv?raw"
import { parsePlacesCatalogCsv } from "@/lib/catalog-csv"
import { pathAnchoredAtPin } from "@/lib/path"
import { normalizePhosphorIconName as normalizeIcon } from "@/lib/tag-icons"
import type {
  CatalogTag,
  DraftPlace,
  Place,
  PlacesCatalog,
} from "@/types/place"
import {
  createUniqueTagId,
  isValidGmapUrl,
  isValidParkingCondition,
  isValidPath,
  isValidPathType,
  normalizePlacesCatalog,
  normalizeTagLabel,
  tagKey,
} from "@/types/place"

const catalog = normalizePlacesCatalog(
  parsePlacesCatalogCsv(tagsCsv, placesCsv)
)

function sanitizeCatalogTags(tags: CatalogTag[]): CatalogTag[] {
  return tags.map((tag) => ({
    ...tag,
    icon: normalizeIcon(tag.icon),
    showOnMap: tag.showOnMap === true,
  }))
}

export const places = catalog.places
export const tags = sanitizeCatalogTags(catalog.tags)

export type GoogleMapsListPlace = {
  name: string
  note: string
  longitude: number
  latitude: number
}

export type GoogleMapsListResult = {
  listName: string
  places: GoogleMapsListPlace[]
}

export async function fetchGoogleMapsList(
  url: string
): Promise<GoogleMapsListResult> {
  const response = await fetch("/__places/google-list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(payload?.error ?? "Failed to fetch Google Maps link")
  }

  return (await response.json()) as GoogleMapsListResult
}

export async function savePlacesCatalog(nextCatalog: PlacesCatalog) {
  const sanitizedCatalog: PlacesCatalog = {
    ...nextCatalog,
    tags: sanitizeCatalogTags(nextCatalog.tags),
  }

  const response = await fetch("/__places", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sanitizedCatalog),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(payload?.error ?? "Failed to save places")
  }
}

export function createPlaceId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (slug.length > 0) {
    return slug
  }

  return `place-${Date.now()}`
}

export function placeAlreadyExists(
  candidate: Pick<Place, "name">,
  existingPlaces: Place[]
) {
  const slug = createPlaceId(candidate.name)
  const normalizedName = candidate.name.trim().toLowerCase()

  return existingPlaces.some(
    (place) =>
      place.id === slug || place.name.trim().toLowerCase() === normalizedName
  )
}

export function createUniquePlaceId(name: string, existingIds: Set<string>) {
  const base = createPlaceId(name)

  if (!existingIds.has(base)) {
    return base
  }

  let suffix = 2

  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

export function tagExistsInCatalog(label: string, catalogTags: CatalogTag[]) {
  const key = tagKey(label)
  return catalogTags.some((tag) => tagKey(tag.label) === key)
}

export function addTagToCatalog(
  catalogTags: CatalogTag[],
  label: string
): CatalogTag[] | null {
  const normalized = normalizeTagLabel(label)

  if (!normalized || tagExistsInCatalog(normalized, catalogTags)) {
    return null
  }

  const existingIds = new Set(catalogTags.map((tag) => tag.id))
  const id = createUniqueTagId(normalized, existingIds)

  return [
    ...catalogTags,
    { id, label: normalized, icon: null, description: "", showOnMap: false },
  ]
}

export function removeTagFromCatalog(
  catalogTags: CatalogTag[],
  tagId: string
): CatalogTag[] {
  return catalogTags.filter((tag) => tag.id !== tagId)
}

export function removeTagFromPlaces(
  placesList: Place[],
  tagId: string
): Place[] {
  return placesList.map((place) => ({
    ...place,
    tags: place.tags.filter((tag) => tag !== tagId),
  }))
}

export function setTagIcon(
  catalogTags: CatalogTag[],
  tagId: string,
  icon: string | null
): CatalogTag[] {
  const normalizedIcon = normalizeIcon(icon)

  return catalogTags.map((tag) =>
    tag.id === tagId ? { ...tag, icon: normalizedIcon } : tag
  )
}

export function setTagShowOnMap(
  catalogTags: CatalogTag[],
  tagId: string,
  showOnMap: boolean
): CatalogTag[] {
  return catalogTags.map((tag) =>
    tag.id === tagId ? { ...tag, showOnMap } : tag
  )
}

export function resolvePlaceMapTagIcon(
  placeTags: string[],
  catalogTags: CatalogTag[]
): string | null {
  const placeTagSet = new Set(placeTags)

  for (const tag of catalogTags) {
    if (!placeTagSet.has(tag.id)) {
      continue
    }

    if (tag.showOnMap && tag.icon) {
      return tag.icon
    }
  }

  return null
}

export function moveTag(
  catalogTags: CatalogTag[],
  fromIndex: number,
  toIndex: number
) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= catalogTags.length ||
    toIndex >= catalogTags.length ||
    fromIndex === toIndex
  ) {
    return catalogTags
  }

  const next = [...catalogTags]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
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
    pathType: String(place.pathType),
    path: [...place.path],
  }
}

export function fromDraft(draft: DraftPlace): Place | null {
  const longitude = Number(draft.longitude)
  const latitude = Number(draft.latitude)
  const parkingCondition = Number(draft.parkingCondition)
  const pathType = Number(draft.pathType)
  const gmapUrl = draft.gmapUrl.trim()
  const path =
    pathType === -1
      ? []
      : pathAnchoredAtPin(pathType, longitude, latitude, draft.path)

  if (
    !draft.id.trim() ||
    !draft.name.trim() ||
    !isValidLongitudeString(draft.longitude) ||
    !isValidLatitudeString(draft.latitude) ||
    !isValidParkingCondition(parkingCondition) ||
    (gmapUrl !== "" && !isValidGmapUrl(gmapUrl)) ||
    !isValidPathType(pathType) ||
    !isValidPath(path) ||
    (pathType !== -1 && path.length < 2)
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
    pathType,
    path,
  }
}

export function isValidLongitudeString(value: string) {
  const number = Number(value)

  return (
    value.trim().length > 0 &&
    Number.isFinite(number) &&
    number >= -180 &&
    number <= 180
  )
}

export function isValidLatitudeString(value: string) {
  const number = Number(value)

  return (
    value.trim().length > 0 &&
    Number.isFinite(number) &&
    number >= -90 &&
    number <= 90
  )
}

export function validateLongitude(value: string) {
  if (!value.trim()) {
    return "Longitude is required"
  }

  if (!isValidLongitudeString(value)) {
    return "Enter a valid longitude"
  }

  return true
}

export function validateLatitude(value: string) {
  if (!value.trim()) {
    return "Latitude is required"
  }

  if (!isValidLatitudeString(value)) {
    return "Enter a valid latitude"
  }

  return true
}

export function validateParkingCondition(value: string) {
  if (!value.trim()) {
    return "Parking condition is required"
  }

  if (!isParkingConditionValue(Number(value))) {
    return "Select a valid parking condition"
  }

  return true
}

export function validatePathType(value: string) {
  if (!value.trim()) {
    return "Path type is required"
  }

  if (!isPathTypeValue(Number(value))) {
    return "Select a valid path type"
  }

  return true
}

export function validatePathForDraft(draft: DraftPlace) {
  const pathType = Number(draft.pathType)

  if (!isPathTypeValue(pathType)) {
    return "Select a valid path type"
  }

  if (pathType === -1) {
    return true
  }

  if (!isValidPath(draft.path) || draft.path.length < 2) {
    return "Draw a path with at least two points"
  }

  return true
}

export function validateGmapUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return true
  }

  try {
    const url = new URL(trimmed)

    if (url.protocol === "http:" || url.protocol === "https:") {
      return true
    }

    return "Enter an http or https URL"
  } catch {
    return "Enter an http or https URL"
  }
}

export function createEmptyDraft(): DraftPlace {
  return {
    id: `draft-${Date.now()}`,
    name: "",
    note: "",
    longitude: "114.1465859",
    latitude: "22.3244775",
    tags: [],
    parkingCondition: "-1",
    gmapUrl: "",
    pathType: "-1",
    path: [],
  }
}
