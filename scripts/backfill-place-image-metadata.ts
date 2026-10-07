import exifr from "exifr"
import sharp from "sharp"

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script."
  )
}

const restUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`

async function restRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${restUrl}/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey!,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    throw new Error(
      `Supabase REST request failed (${response.status}): ${await response.text()}`
    )
  }
  return response
}

type ImageRow = {
  id: string
  place_id: string
  position: number
  data_url: string
}

const pageSize = 10
let offset = 0
let processed = 0
let failed = 0

while (true) {
  const params = new URLSearchParams({
    select: "id,place_id,position,data_url",
    order: "id.asc",
    limit: String(pageSize),
    offset: String(offset),
  })
  const response = await restRequest(`place_images?${params}`)
  const rows = (await response.json()) as ImageRow[]
  if (rows.length === 0) break

  for (const row of rows) {
    try {
      const match = row.data_url.match(
        /^data:image\/[a-z0-9.+-]+;base64,([a-z0-9+/]+=*)$/i
      )
      if (!match) throw new Error("Unsupported image data URL")
      const source = Buffer.from(match[1], "base64")
      const gps = await exifr.gps(source).catch(() => null)
      const oriented = await sharp(source).rotate().toBuffer()
      const { width, height } = await sharp(oriented).metadata()
      if (!width || !height)
        throw new Error("Could not determine image dimensions")
      const thumbnail = await sharp(oriented)
        .resize({
          width: 320,
          height: 320,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer()
      const latitude = gps?.latitude
      const longitude = gps?.longitude
      const hasGps =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude! >= -90 &&
        latitude! <= 90 &&
        longitude! >= -180 &&
        longitude! <= 180
      await restRequest("place_image_metadata?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          id: row.id,
          place_id: row.place_id,
          position: row.position,
          width,
          height,
          latitude: hasGps ? latitude : null,
          longitude: hasGps ? longitude : null,
          thumbnail_data_url: `data:image/webp;base64,${thumbnail.toString("base64")}`,
        }),
      })
      processed += 1
    } catch (cause) {
      failed += 1
      console.error(`Failed ${row.id}:`, cause)
    }
  }

  offset += rows.length
  console.log(`Processed ${processed}; failed ${failed}`)
  if (rows.length < pageSize) break
}

if (failed > 0) process.exitCode = 1
