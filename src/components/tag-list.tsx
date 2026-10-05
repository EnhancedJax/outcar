import { useAppState } from "@/app-state"
import { TagChip } from "@/components/tag-chip"
import { motion, stagger } from "motion/react"

export function TagList() {
  const {
    tags,
    activeTag,
    setActiveTag,
    viewerMode,
    selectedPlaceId,
    isCatalogLoading,
  } = useAppState()

  if (!viewerMode || tags.length === 0 || selectedPlaceId !== null) {
    return null
  }

  function handleTagClick(tagId: string) {
    setActiveTag(activeTag === tagId ? null : tagId)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
      <motion.div
        className="pointer-events-auto flex w-full gap-2 overflow-visible overflow-x-auto px-4 pb-4"
        role="toolbar"
        aria-label="Filter places by tag"
        initial="hidden"
        animate={isCatalogLoading ? "hidden" : "show"}
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              delayChildren: stagger(0.08, { startDelay: 1 }),
            },
          },
        }}
      >
        {tags.map((tag) => {
          const isActive = activeTag === tag.id

          return (
            <motion.button
              key={tag.id}
              type="button"
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium shadow-lg transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
              aria-pressed={isActive}
              onClick={() => handleTagClick(tag.id)}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <TagChip catalogTag={tag} />
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
