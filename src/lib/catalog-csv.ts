import {
  isValidGmapUrl,
  isValidParkingCondition,
  type CatalogTag,
  type Place,
  type PlacesCatalog,
} from "../types/place.js"
import { parsePath, parsePathType, serializePath } from "./path.js"

const TAG_COLUMNS = [
  "id",
  "label",
  "icon",
  "color",
  "description",
  "showOnMap",
  "displayTitle",
] as const
const PLACE_COLUMNS = [
  "id",
  "name",
  "note",
  "longitude",
  "latitude",
  "tags",
  "parkingCondition",
  "gmapUrl",
  "pathType",
  "path",
] as const
const TAG_SEPARATOR = "|"

function escapeCsvField(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

function parseCsv(source: string): string[][] {
  const text = source.replace(/^\uFEFF/, "")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ",") {
      row.push(field)
      field = ""
      continue
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1
      }

      row.push(field)
      field = ""

      if (!(row.length === 1 && row[0] === "")) {
        rows.push(row)
      }

      row = []
      continue
    }

    field += char
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)

    if (!(row.length === 1 && row[0] === "")) {
      rows.push(row)
    }
  }

  return rows
}

function recordsFromCsv(source: string, columns: readonly string[]) {
  const rows = parseCsv(source)

  if (rows.length === 0) {
    throw new Error(`Expected CSV columns: ${columns.join(",")}`)
  }

  const header = rows[0]

  if (
    header.length !== columns.length ||
    header.some((column, index) => column !== columns[index])
  ) {
    throw new Error(`Expected CSV columns: ${columns.join(",")}`)
  }

  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {}

    for (const [index, column] of columns.entries()) {
      record[column] = row[index] ?? ""
    }

    return record
  })
}

function parseCoordinate(value: string, field: string) {
  const coordinate = Number(value)

  if (!Number.isFinite(coordinate)) {
    throw new Error(`Invalid ${field}: ${value}`)
  }

  return coordinate
}

function parseParkingCondition(value: string) {
  const trimmed = value.trim()
  const parkingCondition = trimmed === "" ? -1 : Number(trimmed)

  if (!isValidParkingCondition(parkingCondition)) {
    throw new Error(`Invalid parkingCondition: ${value}`)
  }

  return parkingCondition
}

function parseGmapUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (!isValidGmapUrl(trimmed)) {
    throw new Error(`Invalid gmapUrl: ${value}`)
  }

  return trimmed
}

function parseTagIds(value: string) {
  if (!value) {
    return []
  }

  return value
    .split(TAG_SEPARATOR)
    .map((tagId) => tagId.trim())
    .filter((tagId) => tagId.length > 0)
}

export function parsePlacesCatalogCsv(
  tagsSource: string,
  placesSource: string
): PlacesCatalog {
  const tags: CatalogTag[] = recordsFromCsv(tagsSource, TAG_COLUMNS).map(
    (record) => ({
      id: record.id,
      label: record.label,
      icon: record.icon ? record.icon : null,
      color: record.color ? record.color : null,
      description: record.description,
      showOnMap: record.showOnMap === "true",
      displayTitle: record.displayTitle ? record.displayTitle : "",
    })
  )

  const places: Place[] = recordsFromCsv(placesSource, PLACE_COLUMNS).map(
    (record) => {
      const pathType = parsePathType(record.pathType)
      const path = parsePath(record.path)

      return {
        id: record.id,
        name: record.name,
        note: record.note,
        longitude: parseCoordinate(record.longitude, "longitude"),
        latitude: parseCoordinate(record.latitude, "latitude"),
        tags: parseTagIds(record.tags),
        parkingCondition: parseParkingCondition(record.parkingCondition),
        gmapUrl: parseGmapUrl(record.gmapUrl),
        pathType,
        path: pathType === -1 ? [] : path,
        images: [],
        hasImages: false,
      }
    }
  )

  return { tags, places }
}

function toCsv(columns: readonly string[], rows: string[][]) {
  return `${[columns.join(","), ...rows.map((row) => row.map(escapeCsvField).join(","))].join("\n")}\n`
}

export function serializePlacesCatalog(catalog: PlacesCatalog) {
  const tags = toCsv(
    TAG_COLUMNS,
    catalog.tags.map((tag) => [
      tag.id,
      tag.label,
      tag.icon ?? "",
      tag.color ?? "",
      tag.description,
      tag.showOnMap ? "true" : "false",
      tag.displayTitle,
    ])
  )

  const places = toCsv(
    PLACE_COLUMNS,
    catalog.places.map((place) => [
      place.id,
      place.name,
      place.note,
      String(place.longitude),
      String(place.latitude),
      place.tags.join(TAG_SEPARATOR),
      String(place.parkingCondition),
      place.gmapUrl ?? "",
      String(place.pathType),
      place.pathType === -1 ? "" : serializePath(place.path),
    ])
  )

  return { tags, places }
}
