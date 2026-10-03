import placesData from "@/data/places.json"
import type { Place } from "@/types/place"

export const places = placesData as Place[]

export async function savePlaces(nextPlaces: Place[]) {
  const response = await fetch("/__places", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(nextPlaces),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new Error(payload?.error ?? "Failed to save places")
  }
}

export function createPlaceId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (slug.length > 0) {
    return slug
  }

  return `place-${Date.now()}`
}
