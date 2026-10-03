import { ArrowDown, ArrowUp, Trash } from "@phosphor-icons/react"

import { TagChip } from "@/components/tag-chip"
import { TagIconPicker } from "@/components/tag-icon-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { usePlaceEditor } from "../place-editor-context"

export function TagsTab() {
  const {
    tags,
    newTagLabel,
    setNewTagLabel,
    isSaving,
    handleAddTag,
    handleMoveTag,
    handleDeleteTag,
    handleSetTagIcon,
  } = usePlaceEditor()

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <p className="text-xs text-muted-foreground">
        Order controls the filter bar in production.
      </p>
      <div className="flex gap-2">
        <Input
          value={newTagLabel}
          onChange={(event) => setNewTagLabel(event.target.value)}
          placeholder="New tag..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void handleAddTag()
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleAddTag()}
          disabled={isSaving}
        >
          Add
        </Button>
      </div>
      {tags.length > 0 ? (
        <ul className="space-y-1">
          {tags.map((tag, index) => (
            <li
              key={tag.id}
              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5"
            >
              <TagIconPicker
                value={tag.icon}
                disabled={isSaving}
                onSelect={(icon) => void handleSetTagIcon(tag.id, icon)}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                <TagChip catalogTag={tag} />
              </span>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => void handleMoveTag(index, "up")}
                disabled={isSaving || index === 0}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => void handleMoveTag(index, "down")}
                disabled={isSaving || index === tags.length - 1}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => void handleDeleteTag(tag.id)}
                disabled={isSaving}
              >
                <Trash />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No tags yet.</p>
      )}
    </div>
  )
}
