import placesCsv from "@/data/places.csv?raw"
import tagsCsv from "@/data/tags.csv?raw"
import type { CatalogTag, Place, PlacesCatalog } from "@/types/place"
import { parsePlacesCatalogCsv } from "@/lib/catalog-csv"
import { normalizePhosphorIconName as normalizeIcon } from "@/lib/tag-icons"
import {
  createUniqueTagId,
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
    { id, label: normalized, icon: null, description: "" },
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
