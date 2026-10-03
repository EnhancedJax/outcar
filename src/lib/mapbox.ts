const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

export function getMapboxToken() {
  if (!MAPBOX_TOKEN) {
    throw new Error("Missing VITE_MAPBOX_ACCESS_TOKEN in .env.local")
  }

  return MAPBOX_TOKEN
}

export function getMapStyle(isDark: boolean) {
  return isDark
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11"
}

export type GeocodingFeature = {
  id: string
  place_name: string
  center: [number, number]
}

export async function searchPlaces(query: string) {
  const token = getMapboxToken()
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  )

  url.searchParams.set("access_token", token)
  url.searchParams.set("limit", "5")

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to search locations")
  }

  const payload = (await response.json()) as { features: GeocodingFeature[] }
  return payload.features
}
