import { cn } from "cn"

import {
  MAP_PIN_CENTER_Y,
  MAP_PIN_TIP_Y,
  MapPinIcon,
} from "@/components/map-pin-icon"
import { TagIcon } from "@/lib/tag-icons"

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
      className="text-destructive"
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
