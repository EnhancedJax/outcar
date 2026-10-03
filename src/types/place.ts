export type Place = {
  id: string
  name: string
  note: string
  longitude: number
  latitude: number
}

export type DraftPlace = {
  id: string
  name: string
  note: string
  longitude: string
  latitude: string
}

export function isValidPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") {
    return false
  }

  const place = value as Record<string, unknown>

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
    place.latitude <= 90
  )
}

export function isValidPlaces(value: unknown): value is Place[] {
  return Array.isArray(value) && value.every(isValidPlace)
}
