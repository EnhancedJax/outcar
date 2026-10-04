import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Plugin } from "vite"

import { serializePlacesCatalog } from "../src/lib/catalog-csv.js"
import { isValidPlacesCatalog } from "../src/types/place.js"
import { fetchGoogleMapsList } from "./google-maps-list.js"

const TAGS_PATH = resolve(import.meta.dirname, "../src/data/tags.csv")
const PLACES_PATH = resolve(import.meta.dirname, "../src/data/places.csv")

async function readJsonBody(req: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function sendJson(
  res: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown
) {
  res.statusCode = statusCode
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(payload))
}

export function placesApiPlugin(): Plugin {
  return {
    name: "places-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__places", async (req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? ""

        if (req.method === "POST" && pathname === "/google-list") {
          try {
            const body = (await readJsonBody(req)) as { url?: unknown }

            if (typeof body.url !== "string" || !body.url.trim()) {
              sendJson(res, 400, { error: "Missing url in request body." })
              return
            }

            const result = await fetchGoogleMapsList(body.url.trim())
            sendJson(res, 200, result)
          } catch (error) {
            sendJson(res, 500, {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch Google Maps link",
            })
          }
          return
        }

        if (req.method !== "PUT" || (pathname !== "" && pathname !== "/")) {
          next()
          return
        }

        try {
          const body = await readJsonBody(req)

          if (!isValidPlacesCatalog(body)) {
            sendJson(res, 400, { error: "Invalid places catalog payload" })
            return
          }

          const files = serializePlacesCatalog(body)

          await writeFile(TAGS_PATH, files.tags, "utf8")
          await writeFile(PLACES_PATH, files.places, "utf8")

          sendJson(res, 200, { ok: true })
        } catch (error) {
          sendJson(res, 500, {
            error:
              error instanceof Error ? error.message : "Failed to save places",
          })
        }
      })
    },
  }
}
