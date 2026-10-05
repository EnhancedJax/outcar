import {
  isPathTypeValue,
  type PathCoordinate,
  type PathTypeValue,
} from "../constants/path.js"

const COORDINATE_SEPARATOR = "|"
const COORDINATE_PAIR_SEPARATOR = ","

export function serializePath(path: PathCoordinate[]) {
  return path
    .map(
      ([longitude, latitude]) =>
        `${longitude}${COORDINATE_PAIR_SEPARATOR}${latitude}`
    )
    .join(COORDINATE_SEPARATOR)
}

function parseCoordinatePair(value: unknown, source: string): PathCoordinate {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number"
  ) {
    throw new Error(`Invalid path coordinate pair: ${source}`)
  }

  const [longitude, latitude] = value

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(`Invalid path coordinate pair: ${source}`)
  }

  return [longitude, latitude]
}

function parseDelimitedPath(value: string): PathCoordinate[] {
  return value.split(COORDINATE_SEPARATOR).map((pair) => {
    const values = pair.split(COORDINATE_PAIR_SEPARATOR)

    if (
      values.length !== 2 ||
      values.some((coordinate) => !coordinate.trim())
    ) {
      throw new Error(`Invalid path coordinate pair: ${pair}`)
    }

    return parseCoordinatePair(
      values.map((coordinate) => Number(coordinate)),
      pair
    )
  })
}

export function parsePath(value: string): PathCoordinate[] {
  const trimmed = value.trim()

  if (!trimmed) {
    return []
  }

  if (trimmed.startsWith("[")) {
    let parsed: unknown

    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error(`Invalid path: ${value}`)
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid path: ${value}`)
    }

    return parsed.map((pair) => parseCoordinatePair(pair, JSON.stringify(pair)))
  }

  return parseDelimitedPath(trimmed)
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
