import {
  isPathTypeValue,
  type PathCoordinate,
  type PathTypeValue,
} from "../constants/path.js"

const COORDINATE_SEPARATOR = "|"
const COORDINATE_PAIR_SEPARATOR = ","

export function serializePath(path: PathCoordinate[]) {
  return path
    .map(([longitude, latitude]) => `${longitude}${COORDINATE_PAIR_SEPARATOR}${latitude}`)
    .join(COORDINATE_SEPARATOR)
}

export function parsePath(value: string): PathCoordinate[] {
  const trimmed = value.trim()

  if (!trimmed) {
    return []
  }

  const coordinates: PathCoordinate[] = []

  for (const pair of trimmed.split(COORDINATE_SEPARATOR)) {
    const [longitudeRaw, latitudeRaw] = pair.split(COORDINATE_PAIR_SEPARATOR)

    if (!longitudeRaw || !latitudeRaw) {
      throw new Error(`Invalid path coordinate pair: ${pair}`)
    }

    const longitude = Number(longitudeRaw)
    const latitude = Number(latitudeRaw)

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180 ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new Error(`Invalid path coordinate pair: ${pair}`)
    }

    coordinates.push([longitude, latitude])
  }

  return coordinates
}

export function parsePathType(value: string): PathTypeValue {
  const trimmed = value.trim()
  const pathType = trimmed === "" ? -1 : Number(trimmed)

  if (!isPathTypeValue(pathType)) {
    throw new Error(`Invalid pathType: ${value}`)
  }

  return pathType
}

export function pathAnchoredAtPin(
  pathType: PathTypeValue,
  longitude: number,
  latitude: number,
  path: PathCoordinate[]
): PathCoordinate[] {
  if (pathType === -1 || path.length === 0) {
    return []
  }

  const pin: PathCoordinate = [longitude, latitude]

  if (pathType === 0) {
    const next = [...path]
    next[next.length - 1] = pin
    return next
  }

  const next = [...path]
  next[0] = pin
  return next
}

export function reversePath(path: PathCoordinate[]) {
  return [...path].reverse()
}

export function pathBounds(
  longitude: number,
  latitude: number,
  path: PathCoordinate[]
) {
  let minLng = longitude
  let maxLng = longitude
  let minLat = latitude
  let maxLat = latitude

  for (const [lng, lat] of path) {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ] as [[number, number], [number, number]]
}
