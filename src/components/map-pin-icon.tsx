import { cn } from "cn"

export const MAP_PIN_VIEWBOX = 256
// Fill-weight MapPin tip lands on the 240 line; the rest of the viewBox is padding.
export const MAP_PIN_TIP_Y = 240
export const MAP_PIN_CENTER_Y = 104
export const MAP_PIN_CENTER_RADIUS = 32

// Phosphor fill MapPin body without the counter-wound center hole.
const MAP_PIN_BODY_PATH =
  "M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Z"

type MapPinIconProps = {
  className?: string
  variant: "dotted" | "solid"
}

export function MapPinIcon({ className, variant }: MapPinIconProps) {
  return (
    <svg
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
    >
      <path d={MAP_PIN_BODY_PATH} fill="currentColor" />
      {variant === "dotted" ? (
        <circle
          cx={MAP_PIN_VIEWBOX / 2}
          cy={MAP_PIN_CENTER_Y}
          r={MAP_PIN_CENTER_RADIUS}
          className="fill-white dark:fill-black"
        />
      ) : null}
    </svg>
  )
}
