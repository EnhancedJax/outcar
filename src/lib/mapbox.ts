const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

export function getMapboxToken() {
  if (!MAPBOX_TOKEN) {
    throw new Error("Missing VITE_MAPBOX_ACCESS_TOKEN in .env.local")
  }

  return MAPBOX_TOKEN
}

export const MAPBOX_STANDARD_STYLE =
  "mapbox://styles/enhancedjax/cmutsrmp7000l01sd0hts2hb2"

export type MapAppearance = "colored" | "monochrome"

export function getMapStyle() {
  return MAPBOX_STANDARD_STYLE
}

export function getBasemapConfig(
  appearance: MapAppearance,
  isDark: boolean
): ConfigSpecification {
  return {
    theme: appearance === "monochrome" ? "monochrome" : "default",
    lightPreset: isDark ? "night" : "day",
    show3dObjects: true,
    showPointOfInterestLabels: false,
  }
}

export type GeocodingFeature = {
  id: string
  place_name: string
  center: [number, number]
}

import type { PathCoordinate } from "@/constants/path"
import type { ConfigSpecification } from "mapbox-gl"

export type DirectionsProfile = "driving" | "walking"

export async function fetchDirections(
  profile: DirectionsProfile,
  from: PathCoordinate,
  to: PathCoordinate
): Promise<PathCoordinate[]> {
  const token = getMapboxToken()
  const coordinates = `${from[0]},${from[1]};${to[0]},${to[1]}`
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`
  )

  url.searchParams.set("access_token", token)
  url.searchParams.set("geometries", "geojson")
  url.searchParams.set("overview", "full")

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to fetch directions")
  }

  const payload = (await response.json()) as {
    routes?: Array<{ geometry?: { coordinates?: PathCoordinate[] } }>
  }

  const coordinatesResult = payload.routes?.[0]?.geometry?.coordinates

  if (!coordinatesResult || coordinatesResult.length < 2) {
    throw new Error("No route found between these points")
  }

  return coordinatesResult
}
