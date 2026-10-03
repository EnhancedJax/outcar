import { TagIcon } from "@/lib/tag-icons"
import type { CatalogTag } from "@/types/place"

type TagChipProps = {
  catalogTag: CatalogTag
  className?: string
}

export function TagChip({ catalogTag, className = "" }: TagChipProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {catalogTag.icon ? (
        <TagIcon name={catalogTag.icon} size={14} className="shrink-0" />
      ) : null}
      <span>{catalogTag.label}</span>
    </span>
  )
}
