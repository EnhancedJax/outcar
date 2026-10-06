import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { IncomingMessage, ServerResponse } from "node:http"

import { htmlEscape, readRows, replaceMeta } from "./_lib/catalog.js"

type ShareKind = "place" | "tag"

function updateTitle(html: string, title: string) {
  return html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${htmlEscape(title)}</title>`
  )
}

function updateCanonical(html: string, canonicalUrl: string) {
  return html.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i, (tag) =>
    tag.replace(/\bhref=["'][^"']*["']/i, `href="${htmlEscape(canonicalUrl)}"`)
  )
}

function withMetadata(
  html: string,
  metadata: {
    title: string
    description: string
    url: string
    image: string
  }
) {
  let output = updateTitle(html, metadata.title)
  output = replaceMeta(output, "name", "description", metadata.description)
  output = replaceMeta(output, "property", "og:title", metadata.title)
  output = replaceMeta(
    output,
    "property",
    "og:description",
    metadata.description
  )
  output = replaceMeta(output, "property", "og:url", metadata.url)
  output = replaceMeta(output, "property", "og:image", metadata.image)
  output = replaceMeta(output, "name", "twitter:title", metadata.title)
  output = replaceMeta(
    output,
    "name",
    "twitter:description",
    metadata.description
  )
  output = replaceMeta(output, "name", "twitter:image", metadata.image)
  return updateCanonical(output, metadata.url)
}

function asString(value: unknown) {
  return typeof value === "string" ? value : ""
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse
) {
  const requestUrl = new URL(
    request.url ?? "/api/share",
    `https://${request.headers.host ?? "localhost"}`
  )
  const kind = requestUrl.searchParams.get("kind") as ShareKind | null
  const id = requestUrl.searchParams.get("id") ?? ""
  const origin = requestUrl.origin
  const homeMetadata = {
    title: "香港電單車出車地圖｜Hong Kong Motorcycle Ride Map",
    description: "有邊度好去？探索香港適合電單車出車的景點、咖啡店和小路。",
    url: `${origin}/`,
    image: `${origin}/share-card.png`,
  }

  let metadata = homeMetadata
  let status = 404
  if (id && kind === "place") {
    const rows = await readRows("places", {
      select: "id,name,note",
      id: `eq.${id}`,
      limit: "1",
    })
    const place = rows?.[0]
    if (place) {
      const name = asString(place.name)
      const path = `/places/${encodeURIComponent(id)}`
      metadata = {
        title: `${name}｜香港電單車出車地圖`,
        description: asString(place.note) || "探索香港適合電單車出車的景點。",
        url: `${origin}${path}`,
        image: `${origin}/api/place-image?id=${encodeURIComponent(id)}`,
      }
      status = 200
    }
  } else if (id && kind === "tag") {
    const rows = await readRows("tags", {
      select: "id,label,description,display_title",
      id: `eq.${id}`,
      limit: "1",
    })
    const tag = rows?.[0]
    if (tag) {
      const label = asString(tag.label)
      const title = asString(tag.display_title) || label
      const path = `/tags/${encodeURIComponent(id)}`
      metadata = {
        title: `${title}｜香港電單車出車地圖`,
        description: asString(tag.description) || `探索「${label}」相關景點。`,
        url: `${origin}${path}`,
        image: `${origin}/share-card.png`,
      }
      status = 200
    }
  }

  try {
    const html = readFileSync(resolve(process.cwd(), "dist/index.html"), "utf8")
    response.statusCode = status
    response.setHeader("Content-Type", "text/html; charset=utf-8")
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600"
    )
    response.end(withMetadata(html, metadata))
  } catch {
    response.statusCode = 500
    response.setHeader("Content-Type", "text/plain; charset=utf-8")
    response.end("Unable to load the application shell.")
  }
}
