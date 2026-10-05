const XSSI_PREFIX = ")]}'\n"

const REDIRECT_USER_AGENT = "Mozilla/5.0"

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

function isGoogleMapsHost(hostname: string) {
  return (
    hostname === "maps.google.com" ||
    hostname.endsWith(".google.com") ||
    hostname === "maps.app.goo.gl" ||
    hostname === "goo.gl"
  )
}

function assertGoogleMapsUrl(url: string) {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    throw new Error("Invalid URL. Paste a Google Maps share link.")
  }

  if (!isGoogleMapsHost(parsed.hostname)) {
    throw new Error("URL must be a Google Maps share link.")
  }
}

async function followRedirects(url: string, maxHops = 10) {
  let current = url

  for (let i = 0; i < maxHops; i++) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": REDIRECT_USER_AGENT },
    })

    await response.body?.cancel()

    const location = response.headers.get("location")

    if (!location) {
      return response.url || current
    }

    current = location.startsWith("/")
      ? new URL(location, current).href
      : location
  }

  return current
}

function normalizeShareUrl(url: string) {
  const trimmed = url.trim()

  if (trimmed.includes("goo.gl/") || trimmed.includes("maps.app.goo.gl")) {
    const parsed = new URL(trimmed)
    if (!parsed.searchParams.has("_imcp")) {
      parsed.searchParams.set("_imcp", "1")
    }
    return parsed.href
  }

  return trimmed
}

async function resolveShareUrl(url: string) {
  assertGoogleMapsUrl(url)

  let resolved = normalizeShareUrl(url)

  if (
    resolved.includes("goo.gl/") ||
    resolved.includes("maps.app") ||
    !resolved.includes("google.com/maps")
  ) {
    resolved = await followRedirects(resolved)
  }

  assertGoogleMapsUrl(resolved)

  return resolved
}

function isListUrl(resolvedUrl: string) {
  const decoded = decodeURIComponent(resolvedUrl)

  if (/\/maps\/placelists\/list\//.test(decoded)) {
    return true
  }

  return (
    /!11m2!2s[^!]+!3e3/.test(decoded) || /!4m3!11m2!2s[^!]+!3e3/.test(decoded)
  )
}

function isPlaceUrl(resolvedUrl: string) {
  return /\/maps\/place\//.test(decodeURIComponent(resolvedUrl))
}

function extractListId(resolvedUrl: string) {
  const placelistMatch = /\/maps\/placelists\/list\/([^/?#]+)/.exec(resolvedUrl)
  if (placelistMatch?.[1]) {
    return placelistMatch[1]
  }

  const decoded = decodeURIComponent(resolvedUrl)
  const dataMatch = /!2s([^!&?#\s]+)!3e3/.exec(decoded)
  if (dataMatch?.[1]) {
    return dataMatch[1]
  }

  throw new Error(
    "Could not find a saved list in that URL. Share a Google Maps saved-places list link."
  )
}

function decodePlaceName(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim()
  } catch {
    return value.replace(/\+/g, " ").trim()
  }
}

function parsePlaceFromUrl(resolvedUrl: string): GoogleMapsListPlace {
  const decoded = decodeURIComponent(resolvedUrl)

  const pathMatch = /\/maps\/place\/([^/@?]+)/.exec(decoded)
  const queryMatch = /[?&]q=([^&]+)/.exec(decoded)
  const name =
    (pathMatch?.[1] ? decodePlaceName(pathMatch[1]) : null) ??
    (queryMatch?.[1] ? decodePlaceName(queryMatch[1]) : null) ??
    "Unknown place"

  const exactCoords = /!8m2!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(
    decoded
  )
  const atCoords = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(decoded)

  const latitude = Number(exactCoords?.[1] ?? atCoords?.[1])
  const longitude = Number(exactCoords?.[2] ?? atCoords?.[2])

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Could not extract coordinates from that place link.")
  }

  return {
    name,
    note: "",
    longitude,
    latitude,
  }
}

function getString(arr: unknown[], index: number) {
  const value = arr[index]
  return typeof value === "string" ? value : null
}

function parsePlaces(root: unknown[]): GoogleMapsListPlace[] {
  const rawPlaces = root[8]
  if (!Array.isArray(rawPlaces)) {
    return []
  }

  const places: GoogleMapsListPlace[] = []

  for (const raw of rawPlaces) {
    if (!Array.isArray(raw)) {
      continue
    }

    const info = raw[1]
    if (!Array.isArray(info)) {
      continue
    }

    const coords = info[5]
    const latitude =
      Array.isArray(coords) && typeof coords[2] === "number" ? coords[2] : null
    const longitude =
      Array.isArray(coords) && typeof coords[3] === "number" ? coords[3] : null

    if (latitude === null || longitude === null) {
      continue
    }

    const name = typeof raw[2] === "string" ? raw[2].trim() : "Unknown"
    const note = typeof raw[3] === "string" ? raw[3] : ""

    if (!name) {
      continue
    }

    places.push({
      name,
      note,
      longitude,
      latitude,
    })
  }

  return places
}

async function fetchListById(listId: string): Promise<GoogleMapsListResult> {
  const pb = `!1m1!1s${listId}!2e2!3e2!4i10000!16b1`
  const apiUrl = `https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=en&pb=${pb}`

  const response = await fetch(apiUrl, {
    headers: { "User-Agent": REDIRECT_USER_AGENT },
  })

  if (!response.ok) {
    throw new Error(
      `Google Maps returned HTTP ${response.status}. The list may be private or the URL may be invalid.`
    )
  }

  const text = await response.text()
  const jsonText = text.startsWith(XSSI_PREFIX)
    ? text.slice(XSSI_PREFIX.length)
    : text

  let data: unknown

  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error(
      "Failed to parse Google Maps response. The list may be private or the URL may be invalid."
    )
  }

  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("List not found or not publicly shared.")
  }

  const root = data[0] as unknown[]
  const places = parsePlaces(root)

  if (places.length === 0) {
    throw new Error("No places found in that list.")
  }

  return {
    listName: getString(root, 4) ?? "Untitled list",
    places,
  }
}

export async function fetchGoogleMapsList(url: string) {
  const resolved = await resolveShareUrl(url)

  if (isPlaceUrl(resolved)) {
    const place = parsePlaceFromUrl(resolved)

    return {
      listName: place.name,
      places: [place],
    }
  }

  if (isListUrl(resolved)) {
    return fetchListById(extractListId(resolved))
  }

  throw new Error(
    "Unsupported Google Maps link. Share a place link or a saved-places list link."
  )
}
