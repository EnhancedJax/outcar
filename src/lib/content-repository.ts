import {
  isValidCatalogTag,
  isValidParkingCondition,
  isValidPath,
  isValidPathType,
  isValidPlaceImage,
  isValidPlacesCatalog,
  type CatalogTag,
  type Place,
  type PlaceImage,
  type PlacesCatalog,
} from "@/types/place"
import { normalizePlacesCatalog } from "@/types/place"
import { supabase } from "@/lib/supabase"

type TagRow = Omit<CatalogTag, "showOnMap" | "displayTitle"> & {
  show_on_map: boolean
  display_title: string
  position: number
}
type PlaceRow = Omit<
  Place,
  "tags" | "path" | "parkingCondition" | "gmapUrl" | "pathType"
> & {
  parking_condition: number
  gmap_url: string | null
  path_type: number
  position: number
}
type PlaceTagRow = { place_id: string; tag_id: string; position: number }
type PathRow = {
  place_id: string
  position: number
  longitude: number
  latitude: number
}
type ImageRow = {
  id: string
  place_id: string
  data_url: string
  position: number
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.")
  }
  return supabase
}

function throwIfError(error: { message: string } | null, operation: string) {
  if (error) {
    throw new Error(`Failed to ${operation}: ${error.message}`)
  }
}

export async function loadPlacesCatalog(): Promise<PlacesCatalog> {
  const client = requireSupabase()
  const [tagsResult, placesResult, placeTagsResult, pathsResult] =
    await Promise.all([
      client.from("tags").select("*").order("position"),
      client.from("places").select("*").order("position"),
      client.from("place_tags").select("*").order("position"),
      client.from("place_paths").select("*").order("position"),
    ])

  throwIfError(tagsResult.error, "load tags")
  throwIfError(placesResult.error, "load places")
  throwIfError(placeTagsResult.error, "load place tags")
  throwIfError(pathsResult.error, "load place paths")

  const tags = (tagsResult.data as TagRow[]).map((tag) => ({
    id: tag.id,
    label: tag.label,
    icon: tag.icon,
    color: tag.color,
    description: tag.description,
    showOnMap: tag.show_on_map,
    displayTitle: tag.display_title,
  }))
  const tagIdsByPlace = new Map<string, string[]>()
  for (const row of placeTagsResult.data as PlaceTagRow[]) {
    const ids = tagIdsByPlace.get(row.place_id) ?? []
    ids.push(row.tag_id)
    tagIdsByPlace.set(row.place_id, ids)
  }
  const pathsByPlace = new Map<string, [number, number][]>()
  for (const row of pathsResult.data as PathRow[]) {
    const path = pathsByPlace.get(row.place_id) ?? []
    path.push([row.longitude, row.latitude])
    pathsByPlace.set(row.place_id, path)
  }
  const places = (placesResult.data as PlaceRow[]).map((place) => ({
    id: place.id,
    name: place.name,
    note: place.note,
    longitude: place.longitude,
    latitude: place.latitude,
    tags: tagIdsByPlace.get(place.id) ?? [],
    parkingCondition: place.parking_condition,
    gmapUrl: place.gmap_url,
    pathType: place.path_type,
    path: pathsByPlace.get(place.id) ?? [],
    images: [],
  }))

  for (const tag of tags) {
    if (!isValidCatalogTag(tag)) {
      throw new Error("Supabase returned an invalid tag record.")
    }
  }
  for (const place of places) {
    if (
      !isValidParkingCondition(place.parkingCondition) ||
      !isValidPathType(place.pathType) ||
      !isValidPath(place.path) ||
      (place.pathType === -1 && place.path.length > 0)
    ) {
      throw new Error(`Supabase returned an invalid place record: ${place.id}`)
    }
  }

  const catalog = normalizePlacesCatalog({ tags, places })
  if (!isValidPlacesCatalog(catalog)) {
    throw new Error("Supabase returned an invalid content catalog.")
  }
  return catalog
}

export async function loadPlaceImages(placeId: string): Promise<PlaceImage[]> {
  const client = requireSupabase()
  const result = await client
    .from("place_images")
    .select("id, place_id, data_url, position")
    .eq("place_id", placeId)
    .order("position")

  throwIfError(result.error, "load place images")

  const images = (result.data as ImageRow[]).map((image) => ({
    id: image.id,
    dataUrl: image.data_url,
  }))

  if (!images.every((image) => isValidPlaceImage(image))) {
    throw new Error(`Supabase returned invalid images for place: ${placeId}`)
  }

  return images
}
