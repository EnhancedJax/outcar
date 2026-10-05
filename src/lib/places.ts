import { isParkingConditionValue } from "@/constants/parking"
import { isPathTypeValue } from "@/constants/path"
import { loadPlacesCatalog } from "@/lib/content-repository"
import { pathAnchoredAtPin } from "@/lib/path"
import { normalizePhosphorIconName as normalizeIcon } from "@/lib/tag-icons"
import { supabase } from "@/lib/supabase"
import type {
  CatalogTag,
  DraftPlace,
  Place,
  PlaceImage,
  PlacesCatalog,
} from "@/types/place"
import {
  createUniqueTagId,
  isValidGmapUrl,
  isValidParkingCondition,
  isValidPath,
  isValidTagColor,
  normalizeTagLabel,
  tagKey,
} from "@/types/place"

function sanitizeCatalogTags(tags: CatalogTag[]): CatalogTag[] {
  return tags.map((tag) => ({
    ...tag,
    icon: normalizeIcon(tag.icon),
    color: isValidTagColor(tag.color) ? tag.color : null,
    showOnMap: tag.showOnMap === true,
  }))
}

export async function fetchPlacesCatalog() {
  const catalog = await loadPlacesCatalog()
  return {
    ...catalog,
    tags: sanitizeCatalogTags(catalog.tags),
  }
}

export async function savePlacesCatalog(nextCatalog: PlacesCatalog) {
  const sanitizedCatalog: PlacesCatalog = {
    ...nextCatalog,
    tags: sanitizeCatalogTags(nextCatalog.tags),
  }

  if (!supabase) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.")
  }

  const { error } = await supabase.rpc("replace_catalog", {
    catalog: sanitizedCatalog,
  })
  if (error) {
    throw new Error(`Failed to save places: ${error.message}`)
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
    {
      id,
      label: normalized,
      icon: null,
      color: null,
      description: "",
      showOnMap: false,
      displayTitle: "",
    },
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

export function setTagColor(
  catalogTags: CatalogTag[],
  tagId: string,
  color: string | null
): CatalogTag[] {
  return catalogTags.map((tag) =>
    tag.id === tagId
      ? { ...tag, color: isValidTagColor(color) ? color : null }
      : tag
  )
}

export function resolvePlaceMapTag(
  placeTags: string[],
  catalogTags: CatalogTag[],
  activeTag: string | null = null
): CatalogTag | null {
  const placeTagSet = new Set(placeTags)
  const activeCatalogTag =
    activeTag && placeTagSet.has(activeTag)
      ? catalogTags.find((tag) => tag.id === activeTag)
      : undefined

  return (
    activeCatalogTag ??
    catalogTags.find((tag) => placeTagSet.has(tag.id) && tag.showOnMap) ??
    null
  )
}

export function resolvePlaceMapTagIcon(
  placeTags: string[],
  catalogTags: CatalogTag[],
  activeTag: string | null = null
): string | null {
  return resolvePlaceMapTag(placeTags, catalogTags, activeTag)?.icon ?? null
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
    images: [...place.images],
  }
}

export function fromDraft(draft: DraftPlace): Place | null {
  const longitude = Number(draft.longitude)
  const latitude = Number(draft.latitude)
  const parkingCondition = Number(draft.parkingCondition)
  const pathType = Number(draft.pathType)
  const gmapUrl = draft.gmapUrl.trim()

  if (!isPathTypeValue(pathType)) {
    return null
  }

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
    images: draft.images,
    hasImages: draft.images.length > 0,
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
    images: [],
  }
}

export function createPlaceImage(dataUrl: string): PlaceImage {
  return { id: `image-${crypto.randomUUID()}`, dataUrl }
}
