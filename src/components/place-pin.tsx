import { MapPinIcon } from "@phosphor-icons/react"
import { cn } from "cn"

const MAP_PIN_VIEWBOX = 256
// Fill-weight MapPin tip lands on the 240 line; the rest of the viewBox is padding.
const MAP_PIN_TIP_Y = 240

function AnchoredMapPin({ className }: { className?: string }) {
  return (
    <MapPinIcon
      weight="fill"
      viewBox={`0 0 ${MAP_PIN_VIEWBOX} ${MAP_PIN_TIP_Y}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
      className={cn(
        "pointer-events-auto block w-7 origin-bottom transition-transform",
        className
      )}
      style={{
        height: `calc(1.75rem * ${MAP_PIN_TIP_Y} / ${MAP_PIN_VIEWBOX})`,
      }}
    />
  )
}

export function PlacePin() {
  return <AnchoredMapPin className="text-destructive" />
}

export function SelectedPlacePin() {
  return <AnchoredMapPin className="scale-125 text-primary" />
}

export function PreviewPlacePin() {
  return <AnchoredMapPin className="text-primary" />
}
