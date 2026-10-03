import { useAppState } from "@/app-state"
import { TagChip } from "@/components/tag-chip"

export function TagList() {
  const { tags, activeTag, setActiveTag, viewerMode, selectedPlaceId } =
    useAppState()

  if (!viewerMode || tags.length === 0 || selectedPlaceId !== null) {
    return null
  }

  function handleTagClick(tagId: string) {
    setActiveTag(activeTag === tagId ? null : tagId)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
      <div
        className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-border bg-background/95 p-1"
        role="toolbar"
        aria-label="Filter places by tag"
      >
        {tags.map((tag) => {
          const isActive = activeTag === tag.id

          return (
            <button
              key={tag.id}
              type="button"
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
              aria-pressed={isActive}
              onClick={() => handleTagClick(tag.id)}
            >
              <TagChip catalogTag={tag} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
