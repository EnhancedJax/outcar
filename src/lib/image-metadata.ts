import * as exifr from "exifr"

import type { PlaceImage } from "@/types/place"

const THUMBNAIL_MAX_EDGE = 320

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error(`Failed to read image: ${file.name}`))
    })
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error(`Failed to read image: ${file.name}`))
    )
    reader.readAsDataURL(file)
  })
}

export async function processImageFile(file: File): Promise<PlaceImage> {
  const [dataUrl, bitmap, gps] = await Promise.all([
    readDataUrl(file),
    createImageBitmap(file),
    exifr.gps(file).catch(() => null),
  ])

  try {
    const scale = Math.min(
      1,
      THUMBNAIL_MAX_EDGE / Math.max(bitmap.width, bitmap.height)
    )
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Could not create an image thumbnail.")
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const latitude = gps?.latitude
    const longitude = gps?.longitude
    const hasValidGps =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude! >= -90 &&
      latitude! <= 90 &&
      longitude! >= -180 &&
      longitude! <= 180

    return {
      id: `image-${crypto.randomUUID()}`,
      dataUrl,
      width: bitmap.width,
      height: bitmap.height,
      latitude: hasValidGps ? latitude! : null,
      longitude: hasValidGps ? longitude! : null,
      thumbnailDataUrl: canvas.toDataURL("image/webp", 0.78),
    }
  } finally {
    bitmap.close()
  }
}
