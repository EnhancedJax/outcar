import { ProgressiveBlur } from "@/components/progressive-blur"

export function MapHeader() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 w-full">
      <ProgressiveBlur direction="up" />
      <div className="relative max-w-full px-6 pt-6 pr-40 pb-28 sm:pr-48">
        <h1 className="text-2xl font-medium">香港電單車出車地圖</h1>
        <p className="mt-1 text-sm text-muted-foreground"></p>
      </div>
    </div>
  )
}
