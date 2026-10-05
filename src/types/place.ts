import { isParkingConditionValue } from "../constants/parking.js"
import { isPathTypeValue, type PathCoordinate } from "../constants/path.js"

export type CatalogTag = {
  id: string
  label: string
  icon: string | null
  color: string | null
  description: string
  showOnMap: boolean
  displayTitle: string
}

export type PlaceImage = {
  id: string
  dataUrl: string
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
  pathType: number
  path: PathCoordinate[]
  images: PlaceImage[]
  hasImages: boolean
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
  pathType: string
  path: PathCoordinate[]
  images: PlaceImage[]
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

function isValidImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+=*$/i.test(value)
  )
}

export function isValidPlaceImage(value: unknown): value is PlaceImage {
  if (!value || typeof value !== "object") {
    return false
  }

  const image = value as Record<string, unknown>
  return (
    typeof image.id === "string" &&
    image.id.trim().length > 0 &&
    isValidImageDataUrl(image.dataUrl)
  )
}

function isValidPlaceImages(value: unknown): value is PlaceImage[] {
  if (!Array.isArray(value)) {
    return false
  }

  const ids = new Set<string>()
  return value.every((image) => {
    if (!isValidPlaceImage(image) || ids.has(image.id)) {
      return false
    }
    ids.add(image.id)
    return true
  })
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
    (tag.color === undefined ||
      tag.color === null ||
      isValidTagColor(tag.color)) &&
    (tag.description === undefined || typeof tag.description === "string") &&
    typeof tag.showOnMap === "boolean"
  )
}

export function isValidTagColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
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
  return isParkingConditionValue(value)
}

export function isValidGmapUrl(value: unknown): value is string | null {
  if (value === null) {
    return true
  }

  return typeof value === "string" && value.trim() === value && isHttpUrl(value)
}

function isValidPathCoordinate(value: unknown): value is PathCoordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  )
}

export function isValidPath(value: unknown): value is PathCoordinate[] {
  return Array.isArray(value) && value.every(isValidPathCoordinate)
}

export function isValidPathType(value: unknown): value is number {
  return isPathTypeValue(value)
}

export function isValidPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") {
    return false
  }

  const place = value as Record<string, unknown>

  const tags = place.tags === undefined ? [] : place.tags
  const path = place.path === undefined ? [] : place.path
  const images = place.images === undefined ? [] : place.images
  const pathType = place.pathType === undefined ? -1 : place.pathType

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
    isValidGmapUrl(place.gmapUrl) &&
    isValidPathType(pathType) &&
    isValidPath(path) &&
    isValidPlaceImages(images) &&
    (pathType === -1 ? path.length === 0 : path.length >= 2)
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

      result.push({
        id,
        label,
        icon: null,
        color: null,
        description: "",
        displayTitle: "",
        showOnMap: false,
      })
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
      const color = isValidTagColor(raw.color) ? raw.color : null

      result.push({
        id,
        label,
        icon,
        color,
        description: normalizeTagDescription(raw.description),
        showOnMap: raw.showOnMap === true,
        displayTitle:
          typeof raw.displayTitle === "string" ? raw.displayTitle : "",
      })
      seenIds.add(id)
      seenLabelKeys.add(tagKey(label))
    }
  }

  return result
}

export function normalizePlacesCatalog(value: unknown): PlacesCatalog {
  if (Array.isArray(value)) {
    const places = value.map((place) => {
      const raw = place as Place

      return {
        ...raw,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        pathType: raw.pathType ?? -1,
        path: Array.isArray(raw.path) ? raw.path : [],
      }
    })

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

      tags.push({
        id,
        label,
        icon: null,
        color: null,
        description: "",
        showOnMap: false,
        displayTitle: "",
      })
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
