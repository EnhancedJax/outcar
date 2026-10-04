import { TagIcon } from "@/lib/tag-icons"
import type { CatalogTag } from "@/types/place"
import { cn } from "cn"

type TagChipProps = {
  catalogTag: CatalogTag
  className?: string
}

export function TagChip({ catalogTag, className = "" }: TagChipProps) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex items-center justify-center gap-1",
        className
      )}
    >
      {catalogTag.icon ? <TagIcon name={catalogTag.icon} /> : null}
      <span>{catalogTag.label}</span>
    </span>
  )
}
