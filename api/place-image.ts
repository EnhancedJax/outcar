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
