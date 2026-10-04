import type { MapAppearance } from "./mapbox"

const DEFAULT_PITCH = 0
const MAP_SETTINGS_STORAGE_KEY = "outcar-map-settings"
export const MIN_PITCH = 0
export const MAX_PITCH = 70

export const DEFAULT_VIEW = {
  longitude: 114.1465859,
  latitude: 22.3244775,
  zoom: 10,
  pitch: DEFAULT_PITCH,
}

export function saveMapSettings(settings: {
  appearance: MapAppearance
  pitch: number
}) {
  localStorage.setItem(MAP_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function readMapSettings() {
  const fallback = {
    appearance: "monochrome" as MapAppearance,
    pitch: DEFAULT_PITCH,
  }

  try {
    const raw = localStorage.getItem(MAP_SETTINGS_STORAGE_KEY)

    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as {
      appearance?: unknown
      pitch?: unknown
    }
    const appearance =
      parsed.appearance === "colored" || parsed.appearance === "monochrome"
        ? parsed.appearance
        : fallback.appearance
    const pitch =
      typeof parsed.pitch === "number" &&
      Number.isFinite(parsed.pitch) &&
      parsed.pitch >= MIN_PITCH &&
      parsed.pitch <= MAX_PITCH
        ? parsed.pitch
        : fallback.pitch

    return { appearance, pitch }
  } catch {
    return fallback
  }
}
