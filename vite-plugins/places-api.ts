import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Plugin } from "vite"

import { isValidPlaces } from "../src/types/place.js"

const PLACES_PATH = resolve(import.meta.dirname, "../src/data/places.json")

export function placesApiPlugin(): Plugin {
  return {
    name: "places-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__places", async (req, res, next) => {
        if (req.method !== "PUT") {
          next()
          return
        }

        try {
          const chunks: Buffer[] = []

          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk))
          }

          const body = JSON.parse(Buffer.concat(chunks).toString("utf8"))

          if (!isValidPlaces(body)) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ error: "Invalid places payload" }))
            return
          }

          await writeFile(PLACES_PATH, `${JSON.stringify(body, null, 2)}\n`, "utf8")

          res.statusCode = 200
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to save places",
            })
          )
        }
      })
    },
  }
}
