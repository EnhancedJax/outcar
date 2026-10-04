export type CatalogTag = {
  id: string
  label: string
  icon: string | null
  description: string
}

export type Place = {
  id: string
  name: string
  note: string
  longitude: number
  latitude: number
  tags: string[]
  parkingCondition: number
  gmapUrl: string | null
}

export type DraftPlace = {
  id: string
  name: string
  note: string
  longitude: string
  latitude: string
  tags: string[]
  parkingCondition: string
  gmapUrl: string
}

export type PlacesCatalog = {
  tags: CatalogTag[]
  places: Place[]
}

function isValidPlaceTagIdsArray(value: unknown): value is string[] {
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

    if (seen.has(trimmed)) {
      return false
    }

    seen.add(trimmed)
  }

  return true
}

export function isValidCatalogTag(value: unknown): value is CatalogTag {
  if (!value || typeof value !== "object") {
    return false
  }

  const tag = value as Record<string, unknown>

  return (
    typeof tag.id === "string" &&
    tag.id.trim().length > 0 &&
    typeof tag.label === "string" &&
    tag.label.trim().length > 0 &&
    (tag.icon === null || typeof tag.icon === "string") &&
    (tag.description === undefined || typeof tag.description === "string")
  )
}

function isValidCatalogTagsArray(value: unknown): value is CatalogTag[] {
  if (!Array.isArray(value)) {
    return false
  }

  const seenIds = new Set<string>()
  const seenLabelKeys = new Set<string>()

  for (const tag of value) {
    if (!isValidCatalogTag(tag)) {
      return false
    }

    const id = tag.id.trim()
    const labelKey = tagKey(tag.label)

    if (seenIds.has(id) || seenLabelKeys.has(labelKey)) {
      return false
    }

    seenIds.add(id)
    seenLabelKeys.add(labelKey)
  }

  return true
}

function isLegacyCatalogTagsArray(value: unknown): value is string[] {
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

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function isValidParkingCondition(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value)
}

export function isValidGmapUrl(value: unknown): value is string | null {
  if (value === null) {
    return true
  }

  return typeof value === "string" && value.trim() === value && isHttpUrl(value)
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
    isValidPlaceTagIdsArray(tags) &&
    isValidParkingCondition(place.parkingCondition) &&
    isValidGmapUrl(place.gmapUrl)
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
    isValidCatalogTagsArray(catalog.tags) &&
    Array.isArray(catalog.places) &&
    catalog.places.every(isValidPlace)
  )
}

export function normalizeTagLabel(label: string): string {
  return label.trim()
}

export function normalizeTagDescription(description: unknown): string {
  return typeof description === "string" ? description : ""
}

export function tagKey(label: string): string {
  return normalizeTagLabel(label).toLowerCase()
}

export function createTagId(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (slug.length > 0) {
    return slug
  }

  return `tag-${Date.now()}`
}

export function createUniqueTagId(
  label: string,
  existingIds: Set<string>
): string {
  const base = createTagId(label)

  if (!existingIds.has(base)) {
    return base
  }

  let suffix = 2

  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

function normalizeCatalogTagsInput(tags: unknown): CatalogTag[] {
  if (!Array.isArray(tags)) {
    return []
  }

  const result: CatalogTag[] = []
  const seenIds = new Set<string>()
  const seenLabelKeys = new Set<string>()

  for (const item of tags) {
    if (typeof item === "string") {
      const label = normalizeTagLabel(item)

      if (!label || seenLabelKeys.has(tagKey(label))) {
        continue
      }

      const id = createUniqueTagId(label, seenIds)

      result.push({ id, label, icon: null, description: "" })
      seenIds.add(id)
      seenLabelKeys.add(tagKey(label))
      continue
    }

    if (item && typeof item === "object") {
      const raw = item as Record<string, unknown>

      if (typeof raw.label !== "string") {
        continue
      }

      const label = normalizeTagLabel(raw.label)

      if (!label || seenLabelKeys.has(tagKey(label))) {
        continue
      }

      const requestedId = typeof raw.id === "string" ? raw.id.trim() : ""
      const id =
        requestedId && !seenIds.has(requestedId)
          ? requestedId
          : createUniqueTagId(label, seenIds)
      const icon =
        raw.icon === null || raw.icon === undefined
          ? null
          : typeof raw.icon === "string" && raw.icon.trim()
            ? raw.icon.trim()
            : null

      result.push({
        id,
        label,
        icon,
        description: normalizeTagDescription(raw.description),
      })
      seenIds.add(id)
      seenLabelKeys.add(tagKey(label))
    }
  }

  return result
}

export function normalizePlacesCatalog(value: unknown): PlacesCatalog {
  if (Array.isArray(value)) {
    const places = value.map((place) => ({
      ...(place as Place),
      tags: Array.isArray((place as Place).tags) ? (place as Place).tags : [],
    }))

    return reconcileCatalogTags({ tags: [], places })
  }

  if (!value || typeof value !== "object") {
    return { tags: [], places: [] }
  }

  const catalog = value as Record<string, unknown>

  if (!Array.isArray(catalog.places) || !catalog.places.every(isValidPlace)) {
    return { tags: [], places: [] }
  }

  const tagsInput = catalog.tags

  if (
    !isValidCatalogTagsArray(tagsInput) &&
    !isLegacyCatalogTagsArray(tagsInput)
  ) {
    return { tags: [], places: [] }
  }

  return reconcileCatalogTags({
    tags: normalizeCatalogTagsInput(tagsInput),
    places: catalog.places as Place[],
  })
}

export function reconcileCatalogTags(catalog: PlacesCatalog): PlacesCatalog {
  const tags = normalizeCatalogTagsInput(catalog.tags)
  const idSet = new Set(tags.map((tag) => tag.id))
  const labelToId = new Map(tags.map((tag) => [tagKey(tag.label), tag.id]))

  for (const place of catalog.places) {
    for (const tagRef of place.tags) {
      if (idSet.has(tagRef)) {
        continue
      }

      const key = tagKey(tagRef)

      if (labelToId.has(key)) {
        continue
      }

      const label = normalizeTagLabel(tagRef)

      if (!label) {
        continue
      }

      const id = createUniqueTagId(label, idSet)

      tags.push({ id, label, icon: null, description: "" })
      idSet.add(id)
      labelToId.set(key, id)
    }
  }

  return {
    tags,
    places: catalog.places.map((place) => ({
      ...place,
      tags: [
        ...new Set(
          place.tags
            .map((tagRef) => {
              if (idSet.has(tagRef)) {
                return tagRef
              }

              return labelToId.get(tagKey(tagRef)) ?? null
            })
            .filter((tagId): tagId is string => tagId !== null)
        ),
      ],
    })),
  }
}

export function catalogTagById(
  tags: CatalogTag[],
  tagId: string
): CatalogTag | undefined {
  return tags.find((tag) => tag.id === tagId)
}
