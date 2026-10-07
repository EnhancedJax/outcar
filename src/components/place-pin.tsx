import { useEffect, useRef, useState } from "react"

import { cn } from "cn"

import {
  MAP_PIN_CENTER_Y,
  MAP_PIN_TIP_Y,
  MapPinIcon,
} from "@/components/map-pin-icon"
import { TagIcon } from "@/lib/tag-icons"
import { supabase } from "@/lib/supabase"

type PlacePinProps = {
  tagIcon?: string | null
  tagColor?: string | null
  className?: string
}

function PlacePinContent({ tagIcon, tagColor, className }: PlacePinProps) {
  const resolvedTagIcon = tagIcon ?? null

  return (
    <div
      className={cn("relative", className)}
      style={tagColor ? { color: tagColor } : undefined}
    >
      <MapPinIcon variant={resolvedTagIcon ? "solid" : "dotted"} />
      {resolvedTagIcon ? (
        <span
          className="pointer-events-none absolute left-1/2 flex items-center justify-center text-white dark:text-black"
          style={{
            top: `calc(100% * ${MAP_PIN_CENTER_Y} / ${MAP_PIN_TIP_Y})`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <TagIcon name={resolvedTagIcon} weight="fill" size={14} />
        </span>
      ) : null}
    </div>
  )
}

export function PlacePin({
  tagIcon,
  tagColor,
}: {
  tagIcon?: string | null
  tagColor?: string | null
}) {
  return (
    <PlacePinContent
      tagIcon={tagIcon}
      tagColor={tagColor}
      className="text-muted-foreground"
    />
  )
}

export function SelectedPlacePin({
  tagIcon,
  tagColor,
}: {
  tagIcon?: string | null
  tagColor?: string | null
}) {
  return (
    <PlacePinContent
      tagIcon={tagIcon}
      tagColor={tagColor}
      className="scale-125 text-primary"
    />
  )
}

export function PreviewPlacePin() {
  return <MapPinIcon variant="dotted" className="text-primary" />
}

export function ImageMapPin({
  imageId,
  width,
  height,
}: {
  imageId: string
  width: number
  height: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  useEffect(() => {
    const element = containerRef.current
    const client = supabase
    if (!element || !client) return
    let cancelled = false
    const loadThumbnail = async () => {
      const { data, error } = await client
        .from("place_image_metadata")
        .select("thumbnail_data_url")
        .eq("id", imageId)
        .maybeSingle()
      if (!cancelled && !error) setThumbnail(data?.thumbnail_data_url ?? null)
    }
    if (typeof IntersectionObserver === "undefined") {
      void loadThumbnail()
      return () => {
        cancelled = true
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          void loadThumbnail()
        }
      },
      { rootMargin: "100px" }
    )
    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [imageId])

  return (
    <div
      ref={containerRef}
      className="block w-12 overflow-hidden rounded-md border-2 border-white bg-muted shadow-lg"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          draggable={false}
          className="size-full object-cover"
        />
      ) : null}
    </div>
  )
}
