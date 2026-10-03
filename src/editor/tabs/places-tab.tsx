import { Trash } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { tagKey } from "@/types/place"

import { usePlaceEditor } from "../place-editor-context"

export function PlacesTab() {
  const {
    places,
    tags,
    selectedPlaceId,
    draft,
    isCreating,
    draftNewTagLabel,
    setDraftNewTagLabel,
    isSaving,
    onDraftChange,
    startEdit,
    handleSave,
    handleDelete,
    handleToggleDraftTag,
    handleAddDraftTag,
    cancelDraft,
  } = usePlaceEditor()

  return (
    <div className="space-y-4">
      {draft ? (
        <form
          className="space-y-3 rounded-lg border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={draft.name}
              onChange={(event) =>
                onDraftChange({ ...draft, name: event.target.value }, isCreating)
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="id">Id</Label>
            <Input
              id="id"
              value={draft.id}
              onChange={(event) =>
                onDraftChange({ ...draft, id: event.target.value }, isCreating)
              }
              disabled={!isCreating}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={draft.note}
              onChange={(event) =>
                onDraftChange({ ...draft, note: event.target.value }, isCreating)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isSelected = draft.tags.some(
                    (item) => tagKey(item) === tagKey(tag)
                  )

                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                      onClick={() => handleToggleDraftTag(tag)}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add tags in the Tags tab to assign them here.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                value={draftNewTagLabel}
                onChange={(event) => setDraftNewTagLabel(event.target.value)}
                placeholder="Create and assign tag..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleAddDraftTag()
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleAddDraftTag()}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                value={draft.longitude}
                onChange={(event) =>
                  onDraftChange(
                    { ...draft, longitude: event.target.value },
                    isCreating
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                value={draft.latitude}
                onChange={(event) =>
                  onDraftChange(
                    { ...draft, latitude: event.target.value },
                    isCreating
                  )
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Click the map or drag the selected marker to set coordinates.
          </p>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelDraft}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Saved places</h3>
        <ul className="space-y-1">
          {places.map((place) => (
            <li
              key={place.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                selectedPlaceId === place.id
                  ? "border-primary bg-muted"
                  : "border-border"
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => startEdit(place)}
              >
                <p className="truncate font-medium">{place.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                </p>
                {place.tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {place.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => void handleDelete(place.id)}
                disabled={isSaving}
              >
                <Trash />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
