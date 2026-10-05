import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { parsePlacesCatalogCsv } from "../src/lib/catalog-csv.js"

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    "Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  )
}

const [tagsSource, placesSource] = await Promise.all([
  readFile(resolve("src/data/tags.csv"), "utf8"),
  readFile(resolve("src/data/places.csv"), "utf8"),
])
const catalog = parsePlacesCatalogCsv(tagsSource, placesSource)
const response = await fetch(`${url}/rest/v1/rpc/replace_catalog`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ catalog }),
})

if (!response.ok) {
  throw new Error(`Failed to seed Supabase: ${await response.text()}`)
}

console.log(
  `Seeded ${catalog.tags.length} tags and ${catalog.places.length} places.`
)
