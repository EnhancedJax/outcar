import { useAppState } from "@/app-state"
import { ProgressiveBlur } from "@/components/progressive-blur"
import { TextTransition } from "@/components/text-transition"
import { cn } from "@/lib/utils"

export function MapHeader() {
  const { selectedPlaceId, tags, activeTag } = useAppState()
  const title =
    (activeTag && tags.find((t) => t.id === activeTag)?.displayTitle) ||
    "香港電單車出車地圖"
  const description =
    (activeTag && tags.find((t) => t.id === activeTag)?.description) ||
    "有邊度好去？"

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 w-full pb-10 transition-opacity duration-300",
        selectedPlaceId ? "opacity-0" : "opacity-100"
      )}
    >
      <ProgressiveBlur direction="up" />
      <div className="relative max-w-full px-6 pt-6 sm:pr-48">
        <h1 className="text-2xl font-medium">
          <TextTransition text={title} />
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          <TextTransition text={description} />
        </p>
      </div>
    </div>
  )
}
