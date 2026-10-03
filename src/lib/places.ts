import placesData from "@/data/places.json"
import type { Place, PlacesCatalog } from "@/types/place"
import {
  normalizePlacesCatalog,
  normalizeTagLabel,
  tagKey,
} from "@/types/place"

const catalog = normalizePlacesCatalog(placesData)

export const places = catalog.places
export const tags = catalog.tags

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
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new Error(payload?.error ?? "Failed to fetch Google Maps link")
  }

  return (await response.json()) as GoogleMapsListResult
}

export async function savePlacesCatalog(nextCatalog: PlacesCatalog) {
  const response = await fetch("/__places", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(nextCatalog),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
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
      place.id === slug ||
      place.name.trim().toLowerCase() === normalizedName
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

export function tagExistsInCatalog(label: string, catalogTags: string[]) {
  const key = tagKey(label)
  return catalogTags.some((tag) => tagKey(tag) === key)
}

export function addTagToCatalog(
  catalogTags: string[],
  label: string
): string[] | null {
  const normalized = normalizeTagLabel(label)

  if (!normalized || tagExistsInCatalog(normalized, catalogTags)) {
    return null
  }

  return [...catalogTags, normalized]
}

export function removeTagFromCatalog(
  catalogTags: string[],
  label: string
): string[] {
  const key = tagKey(label)
  return catalogTags.filter((tag) => tagKey(tag) !== key)
}

export function removeTagFromPlaces(placesList: Place[], label: string): Place[] {
  const key = tagKey(label)

  return placesList.map((place) => ({
    ...place,
    tags: place.tags.filter((tag) => tagKey(tag) !== key),
  }))
}

export function moveTag(catalogTags: string[], fromIndex: number, toIndex: number) {
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
