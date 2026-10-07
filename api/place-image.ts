import type { IncomingMessage, ServerResponse } from "node:http"

import { imageDataUrlToBytes, readRows } from "./_lib/catalog.js"

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse
) {
  const requestUrl = new URL(
    request.url ?? "/api/place-image",
    `https://${request.headers.host ?? "localhost"}`
  )
  const placeId = requestUrl.searchParams.get("id")
  const imageId = requestUrl.searchParams.get("imageId")
  const variant = requestUrl.searchParams.get("variant")

  if (imageId) {
    const isThumbnail = variant === "thumbnail"
    const rows = await readRows(
      isThumbnail ? "place_image_metadata" : "place_images",
      isThumbnail
        ? { select: "thumbnail_data_url", id: `eq.${imageId}`, limit: "1" }
        : { select: "data_url", id: `eq.${imageId}`, limit: "1" }
    )
    const image = imageDataUrlToBytes(
      rows?.[0]?.[isThumbnail ? "thumbnail_data_url" : "data_url"]
    )
    if (image) {
      response.statusCode = 200
      response.setHeader("Content-Type", image.contentType)
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable")
      response.setHeader("X-Content-Type-Options", "nosniff")
      response.end(image.bytes)
      return
    }
  }

  if (placeId) {
    const rows = await readRows("place_images", {
      select: "data_url",
      place_id: `eq.${placeId}`,
      order: "position.asc",
      limit: "1",
    })
    const image = imageDataUrlToBytes(rows?.[0]?.data_url)
    if (image) {
      response.statusCode = 200
      response.setHeader("Content-Type", image.contentType)
      response.setHeader(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=3600"
      )
      response.setHeader("X-Content-Type-Options", "nosniff")
      response.end(image.bytes)
      return
    }
  }

  response.statusCode = 302
  response.setHeader(
    "Location",
    new URL("/share-card.png", requestUrl.origin).toString()
  )
  response.setHeader("Cache-Control", "public, max-age=60")
  response.end()
}
