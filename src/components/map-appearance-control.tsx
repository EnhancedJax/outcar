import { Button } from "@/components/ui/button"
import type { MapAppearance } from "@/lib/mapbox"
import { cn } from "cn"

export default function MapAppearanceControl({
  mapAppearance,
  setMapAppearance,
}: {
  mapAppearance: MapAppearance
  setMapAppearance: (mapAppearance: MapAppearance) => void
}) {
  return (
    <div
      className={cn(
        "absolute top-4 z-20 flex gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur",
        import.meta.env.DEV ? "right-16" : "right-4"
      )}
    >
      <Button
        type="button"
        variant={mapAppearance === "monochrome" ? "default" : "outline"}
        size="sm"
        onClick={() => setMapAppearance("monochrome")}
      >
        B&W
      </Button>
      <Button
        type="button"
        variant={mapAppearance === "colored" ? "default" : "ghost"}
        size="sm"
        onClick={() => setMapAppearance("colored")}
      >
        Color
      </Button>
    </div>
  )
}
