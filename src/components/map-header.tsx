import { useAppState } from "@/app-state"
import { ProgressiveBlur } from "@/components/progressive-blur"
import { cn } from "@/lib/utils"

export function MapHeader() {
  const { selectedPlaceId, tags, activeTag } = useAppState()

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 w-full transition-opacity duration-300",
        selectedPlaceId ? "opacity-0" : "opacity-100"
      )}
    >
      <ProgressiveBlur direction="up" />
      <div className="relative max-w-full px-6 pt-6 pr-40 pb-28 sm:pr-48">
        <h1 className="text-2xl font-medium">
          {(activeTag && tags.find((t) => t.id === activeTag)?.displayTitle) ||
            "香港電單車出車地圖"}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          {(activeTag && tags.find((t) => t.id === activeTag)?.description) ||
            "有邊度好去？"}
        </p>
      </div>
    </div>
  )
}
