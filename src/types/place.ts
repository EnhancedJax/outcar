export type Place = {
  id: string
  name: string
  note: string
  longitude: number
  latitude: number
  tags: string[]
}

export type DraftPlace = {
  id: string
  name: string
  note: string
  longitude: string
  latitude: string
  tags: string[]
}

export type PlacesCatalog = {
  tags: string[]
  places: Place[]
}

function isValidTagsArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false
  }

  const seen = new Set<string>()

  for (const tag of value) {
    if (typeof tag !== "string") {
      return false
    }

    const trimmed = tag.trim()

    if (!trimmed) {
      return false
    }

    const key = trimmed.toLowerCase()

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
  }

  return true
}

export function isValidPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") {
    return false
  }

  const place = value as Record<string, unknown>

  const tags = place.tags === undefined ? [] : place.tags

  return (
    typeof place.id === "string" &&
    place.id.length > 0 &&
    typeof place.name === "string" &&
    place.name.length > 0 &&
    typeof place.note === "string" &&
    typeof place.longitude === "number" &&
    Number.isFinite(place.longitude) &&
    place.longitude >= -180 &&
    place.longitude <= 180 &&
    typeof place.latitude === "number" &&
    Number.isFinite(place.latitude) &&
    place.latitude >= -90 &&
    place.latitude <= 90 &&
    isValidTagsArray(tags)
  )
}

export function isValidPlaces(value: unknown): value is Place[] {
  return Array.isArray(value) && value.every(isValidPlace)
}

export function isValidPlacesCatalog(value: unknown): value is PlacesCatalog {
  if (!value || typeof value !== "object") {
    return false
  }

  const catalog = value as Record<string, unknown>

  return (
    isValidTagsArray(catalog.tags) &&
    Array.isArray(catalog.places) &&
    catalog.places.every(isValidPlace)
  )
}

export function normalizeTagLabel(label: string): string {
  return label.trim()
}

export function tagKey(label: string): string {
  return normalizeTagLabel(label).toLowerCase()
}

export function normalizePlacesCatalog(value: unknown): PlacesCatalog {
  if (Array.isArray(value)) {
    const places = value.map((place) => ({
      ...(place as Place),
      tags: Array.isArray((place as Place).tags) ? (place as Place).tags : [],
    }))

    return reconcileCatalogTags({ tags: [], places })
  }

  if (!isValidPlacesCatalog(value)) {
    return { tags: [], places: [] }
  }

  return reconcileCatalogTags(value)
}

export function reconcileCatalogTags(catalog: PlacesCatalog): PlacesCatalog {
  const tags = [...catalog.tags]
  const tagKeys = new Set(tags.map(tagKey))

  for (const place of catalog.places) {
    for (const tag of place.tags) {
      const key = tagKey(tag)

      if (!tagKeys.has(key)) {
        tags.push(normalizeTagLabel(tag))
        tagKeys.add(key)
      }
    }
  }

  return {
    tags,
    places: catalog.places.map((place) => ({
      ...place,
      tags: place.tags.map(normalizeTagLabel),
    })),
  }
}
