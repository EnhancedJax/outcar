import { parsePath } from "@/lib/path"
import { supabase } from "@/lib/supabase"
import {
  isValidCatalogTag,
  isValidParkingCondition,
  isValidPath,
  isValidPathType,
  isValidPlaceImage,
  isValidImageMetadata,
  isValidPlacesCatalog,
  normalizePlacesCatalog,
  type CatalogTag,
  type Place,
  type PlaceImage,
  type PlaceImageMetadata,
  type PlacesCatalog,
} from "@/types/place"

type TagRow = Omit<CatalogTag, "showOnMap" | "displayTitle"> & {
  show_on_map: boolean
  display_title: string
  position: number
}
type PlaceRow = Omit<
  Place,
  | "tags"
  | "path"
  | "parkingCondition"
  | "gmapUrl"
  | "pathType"
  | "images"
  | "imageMetadata"
  | "imagesCount"
> & {
  parking_condition: number
  gmap_url: string | null
  path_type: number
  path: string
  position: number
}
type PlaceTagRow = { place_id: string; tag_id: string; position: number }
type PlaceImageIdRow = { place_id: string }
type PlaceImageMetadataRow = {
  id: string
  place_id: string
  position: number
  width: number
  height: number
  latitude: number | null
  longitude: number | null
}
type ImageRow = {
  id: string
  place_id: string
  data_url: string
  position: number
  width: number
  height: number
  latitude: number | null
  longitude: number | null
  thumbnail_data_url: string
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
  const [
    tagsResult,
    placesResult,
    placeTagsResult,
    imageIdsResult,
    metadataResult,
  ] = await Promise.all([
    client.from("tags").select("*").order("position"),
    client.from("places").select("*").order("position"),
    client.from("place_tags").select("*").order("position"),
    client.from("place_images").select("place_id"),
    client
      .from("place_image_metadata")
      .select("id, place_id, position, width, height, latitude, longitude")
      .order("position"),
  ])

  throwIfError(tagsResult.error, "load tags")
  throwIfError(placesResult.error, "load places")
  throwIfError(placeTagsResult.error, "load place tags")
  throwIfError(imageIdsResult.error, "load place image counts")
  throwIfError(metadataResult.error, "load place image metadata")

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
  const imageCounts = new Map<string, number>()
  for (const row of imageIdsResult.data as PlaceImageIdRow[]) {
    if (typeof row.place_id !== "string" || row.place_id.length === 0) {
      throw new Error("Supabase returned an invalid image record.")
    }
    imageCounts.set(row.place_id, (imageCounts.get(row.place_id) ?? 0) + 1)
  }
  const metadataByPlace = new Map<string, PlaceImageMetadata[]>()
  for (const row of metadataResult.data as PlaceImageMetadataRow[]) {
    const metadata = {
      id: row.id,
      placeId: row.place_id,
      position: row.position,
      width: row.width,
      height: row.height,
      latitude: row.latitude,
      longitude: row.longitude,
    }
    if (!isValidImageMetadata(metadata))
      throw new Error(`Supabase returned invalid image metadata: ${row.id}`)
    const images = metadataByPlace.get(row.place_id) ?? []
    images.push(metadata)
    metadataByPlace.set(row.place_id, images)
  }
  const places: Place[] = (placesResult.data as PlaceRow[]).map((place) => ({
    id: place.id,
    name: place.name,
    note: place.note,
    longitude: place.longitude,
    latitude: place.latitude,
    tags: tagIdsByPlace.get(place.id) ?? [],
    parkingCondition: place.parking_condition,
    gmapUrl: place.gmap_url,
    pathType: place.path_type,
    path: parsePath(place.path),
    images: [],
    imageMetadata: metadataByPlace.get(place.id) ?? [],
    imagesCount: imageCounts.get(place.id) ?? 0,
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

  const metadataResult = await client
    .from("place_image_metadata")
    .select(
      "id, place_id, position, width, height, latitude, longitude, thumbnail_data_url"
    )
    .eq("place_id", placeId)
    .order("position")
  throwIfError(metadataResult.error, "load image metadata")
  const metadata = new Map(
    (metadataResult.data as ImageRow[]).map((image) => [image.id, image])
  )
  const images = (result.data as Pick<ImageRow, "id" | "data_url">[])
    .map((image) => {
      const imageMetadata = metadata.get(image.id)
      return imageMetadata
        ? {
            id: image.id,
            dataUrl: image.data_url,
            width: imageMetadata.width,
            height: imageMetadata.height,
            latitude: imageMetadata.latitude,
            longitude: imageMetadata.longitude,
            thumbnailDataUrl: imageMetadata.thumbnail_data_url,
          }
        : null
    })
    .filter((image): image is PlaceImage => image !== null)

  if (!images.every((image) => isValidPlaceImage(image))) {
    throw new Error(`Supabase returned invalid images for place: ${placeId}`)
  }

  return images
}
