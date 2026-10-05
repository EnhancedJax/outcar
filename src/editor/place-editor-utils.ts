import type { DraftPlace } from "@/types/place"

export type EditorTab = "places" | "tags" | "search"

export type PlacesScreen = "list" | "form"

export function toggleDraftTag(draft: DraftPlace, tagId: string): DraftPlace {
  const hasTag = draft.tags.includes(tagId)

  return {
    ...draft,
    tags: hasTag
      ? draft.tags.filter((item) => item !== tagId)
      : [...draft.tags, tagId],
  }
}
