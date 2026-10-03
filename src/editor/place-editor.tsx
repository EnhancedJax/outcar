import { useEffect, useState } from "react"
import {
  ArrowDown,
  ArrowSquareIn,
  ArrowUp,
  MagnifyingGlass,
  Plus,
  Trash,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  addTagToCatalog,
  createPlaceId,
  createUniquePlaceId,
  fetchGoogleMapsList,
  moveTag,
  placeAlreadyExists,
  removeTagFromCatalog,
  removeTagFromPlaces,
  savePlacesCatalog,
} from "@/lib/places"
import { searchPlaces } from "@/lib/mapbox"
import { tagKey } from "@/types/place"
import type { DraftPlace, Place } from "@/types/place"

type ImportPreviewItem = {
  key: string
  name: string
  note: string
  longitude: number
  latitude: number
  selected: boolean
  alreadyExists: boolean
}

type PlaceEditorProps = {
  places: Place[]
  tags: string[]
  selectedPlaceId: string | null
  draft: DraftPlace | null
  isCreating: boolean
  onPlacesChange: (places: Place[]) => void
  onTagsChange: (tags: string[]) => void
  onSelectPlace: (placeId: string | null) => void
  onDraftChange: (draft: DraftPlace | null, isCreating: boolean) => void
  onImportPreviewChange: (places: Place[] | null) => void
}

function toDraft(place: Place): DraftPlace {
  return {
    id: place.id,
    name: place.name,
    note: place.note,
    longitude: String(place.longitude),
    latitude: String(place.latitude),
    tags: [...place.tags],
  }
}

function fromDraft(draft: DraftPlace): Place | null {
  const longitude = Number(draft.longitude)
  const latitude = Number(draft.latitude)

  if (
    !draft.id.trim() ||
    !draft.name.trim() ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null
  }

  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    note: draft.note,
    longitude,
    latitude,
    tags: draft.tags,
  }
}

function importPreviewToPlaces(items: ImportPreviewItem[]): Place[] {
  return items
    .filter((item) => item.selected && !item.alreadyExists)
    .map((item, index) => ({
      id: `import-preview-${index}-${createPlaceId(item.name)}`,
      name: item.name,
      note: item.note,
      longitude: item.longitude,
      latitude: item.latitude,
      tags: [],
    }))
}

function toggleDraftTag(draft: DraftPlace, tag: string): DraftPlace {
  const key = tagKey(tag)
  const hasTag = draft.tags.some((item) => tagKey(item) === key)

  return {
    ...draft,
    tags: hasTag
      ? draft.tags.filter((item) => tagKey(item) !== key)
      : [...draft.tags, tag],
  }
}

export default function PlaceEditor({
  places,
  tags,
  selectedPlaceId,
  draft,
  isCreating,
  onPlacesChange,
  onTagsChange,
  onSelectPlace,
  onDraftChange,
  onImportPreviewChange,
}: PlaceEditorProps) {
  const [query, setQuery] = useState("")
  const [importUrl, setImportUrl] = useState("")
  const [importListName, setImportListName] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([])
  const [newTagLabel, setNewTagLabel] = useState("")
  const [draftNewTagLabel, setDraftNewTagLabel] = useState("")
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof searchPlaces>>
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ?? null

  useEffect(() => {
    if (importPreview.length === 0) {
      onImportPreviewChange(null)
      return
    }

    onImportPreviewChange(importPreviewToPlaces(importPreview))
  }, [importPreview, onImportPreviewChange])

  async function persistCatalog(nextTags: string[], nextPlaces: Place[]) {
    setIsSaving(true)
    setError(null)

    try {
      await savePlacesCatalog({ tags: nextTags, places: nextPlaces })
      onTagsChange(nextTags)
      onPlacesChange(nextPlaces)
    } catch (persistError) {
      setError(
        persistError instanceof Error
          ? persistError.message
          : "Failed to save places"
      )
    } finally {
      setIsSaving(false)
    }
  }

  function clearImportPreview() {
    setImportListName(null)
    setImportPreview([])
    setImportUrl("")
  }

  function updateImportSelection(key: string, selected: boolean) {
    setImportPreview((current) =>
      current.map((item) =>
        item.key === key && !item.alreadyExists ? { ...item, selected } : item
      )
    )
  }

  async function handleAddTag() {
    const nextTags = addTagToCatalog(tags, newTagLabel)

    if (!nextTags) {
      setError("Enter a unique tag label.")
      return
    }

    await persistCatalog(nextTags, places)
    setNewTagLabel("")
  }

  async function handleDeleteTag(tag: string) {
    const nextTags = removeTagFromCatalog(tags, tag)
    const nextPlaces = removeTagFromPlaces(places, tag)
    await persistCatalog(nextTags, nextPlaces)

    if (draft) {
      onDraftChange(toggleDraftTag(draft, tag), isCreating)
    }
  }

  async function handleMoveTag(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const nextTags = moveTag(tags, index, targetIndex)
    await persistCatalog(nextTags, places)
  }

  async function handleImportPreview() {
    if (!importUrl.trim()) {
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const result = await fetchGoogleMapsList(importUrl.trim())
      const previewItems = result.places.map((place, index) => {
        const alreadyExists = placeAlreadyExists(place, places)

        return {
          key: `${index}-${place.name}-${place.longitude}-${place.latitude}`,
          name: place.name,
          note: place.note,
          longitude: place.longitude,
          latitude: place.latitude,
          selected: !alreadyExists,
          alreadyExists,
        }
      })

      setImportListName(result.listName)
      setImportPreview(previewItems)
    } catch (previewError) {
      clearImportPreview()
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Failed to preview Google Maps link"
      )
    } finally {
      setIsImporting(false)
    }
  }

  async function handleImportConfirm() {
    const selectedItems = importPreview.filter(
      (item) => item.selected && !item.alreadyExists
    )

    if (selectedItems.length === 0) {
      setError("Select at least one new place to import.")
      return
    }

    const existingIds = new Set(places.map((place) => place.id))
    const importedPlaces = selectedItems.map((item) => {
      const id = createUniquePlaceId(item.name, existingIds)
      existingIds.add(id)

      return {
        id,
        name: item.name,
        note: item.note,
        longitude: item.longitude,
        latitude: item.latitude,
        tags: [],
      }
    })

    await persistCatalog(tags, [...places, ...importedPlaces])
    clearImportPreview()
  }

  async function handleSearch() {
    if (!query.trim()) {
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const features = await searchPlaces(query)
      setResults(features)
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Failed to search locations"
      )
    } finally {
      setIsSearching(false)
    }
  }

  function startCreate() {
    onDraftChange(
      {
        id: `draft-${Date.now()}`,
        name: "",
        note: "",
        longitude: "139.7",
        latitude: "35.68",
        tags: [],
      },
      true
    )
    onSelectPlace(null)
  }

  function startEdit(place: Place) {
    onDraftChange(toDraft(place), false)
    onSelectPlace(place.id)
  }

  function applySearchResult(
    feature: Awaited<ReturnType<typeof searchPlaces>>[number]
  ) {
    const [longitude, latitude] = feature.center

    const base =
      draft ??
      (selectedPlace
        ? toDraft(selectedPlace)
        : {
            id: createPlaceId(feature.place_name),
            name: feature.place_name,
            note: "",
            longitude: String(longitude),
            latitude: String(latitude),
            tags: [],
          })

    onDraftChange(
      {
        ...base,
        name: base.name || feature.place_name,
        id: base.id || createPlaceId(feature.place_name),
        longitude: String(longitude),
        latitude: String(latitude),
      },
      isCreating
    )
  }

  async function handleSave() {
    if (!draft) {
      return
    }

    const nextPlace = fromDraft(draft)

    if (!nextPlace) {
      setError("Fill in name and valid coordinates before saving.")
      return
    }

    const duplicateId = places.some(
      (place) =>
        place.id === nextPlace.id &&
        place.id !== (selectedPlace?.id ?? draft.id)
    )

    if (duplicateId) {
      setError("A place with this id already exists.")
      return
    }

    const nextPlaces = isCreating
      ? [...places, nextPlace]
      : places.map((place) =>
          place.id === selectedPlace?.id ? nextPlace : place
        )

    await persistCatalog(tags, nextPlaces)
    onDraftChange(null, false)
    onSelectPlace(nextPlace.id)
    setResults([])
    setQuery("")
  }

  async function handleDelete(placeId: string) {
    const nextPlaces = places.filter((place) => place.id !== placeId)
    await persistCatalog(tags, nextPlaces)

    if (selectedPlaceId === placeId) {
      onSelectPlace(null)
      onDraftChange(null, false)
    }
  }

  function handleToggleDraftTag(tag: string) {
    if (!draft) {
      return
    }

    onDraftChange(toggleDraftTag(draft, tag), isCreating)
  }

  async function handleAddDraftTag() {
    if (!draft) {
      return
    }

    const nextTags = addTagToCatalog(tags, draftNewTagLabel)

    if (!nextTags) {
      setError("Enter a unique tag label.")
      return
    }

    const addedTag = nextTags[nextTags.length - 1]
    await persistCatalog(nextTags, places)
    onDraftChange(
      {
        ...draft,
        tags: draft.tags.some((item) => tagKey(item) === tagKey(addedTag))
          ? draft.tags
          : [...draft.tags, addedTag],
      },
      isCreating
    )
    setDraftNewTagLabel("")
  }

  return (
    <aside className="flex h-full w-full max-w-sm flex-col border-l border-border bg-background/95 backdrop-blur">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-medium">Places editor</h2>
            <p className="text-sm text-muted-foreground">Dev mode only</p>
          </div>
          <Button size="sm" onClick={startCreate}>
            <Plus data-icon="inline-start" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
                  key={tag}
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {tag}
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
                    onClick={() => void handleDeleteTag(tag)}
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

        <div className="space-y-2">
          <Label htmlFor="google-import-url">Import from Google Maps</Label>
          <div className="flex gap-2">
            <Input
              id="google-import-url"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
              placeholder="Place or list link..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleImportPreview()
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleImportPreview()}
              disabled={isImporting}
            >
              Preview
            </Button>
          </div>
          {importPreview.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{importListName}</p>
                <p className="text-xs text-muted-foreground">
                  {importPreview.filter((item) => item.selected && !item.alreadyExists).length}{" "}
                  of{" "}
                  {importPreview.filter((item) => !item.alreadyExists).length} new places
                  selected
                </p>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {importPreview.map((item) => (
                  <li
                    key={item.key}
                    className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                      item.alreadyExists ? "opacity-60" : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={item.selected}
                      disabled={item.alreadyExists}
                      onChange={(event) =>
                        updateImportSelection(item.key, event.target.checked)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      {item.note ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.note}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </p>
                      {item.alreadyExists ? (
                        <p className="text-xs text-muted-foreground">Already saved</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => void handleImportConfirm()}
                  disabled={isSaving}
                >
                  <ArrowSquareIn data-icon="inline-start" />
                  {isSaving ? "Importing..." : "Import selected"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearImportPreview}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="search">Search location</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Mapbox..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleSearch()
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleSearch()}
              disabled={isSearching}
            >
              <MagnifyingGlass />
            </Button>
          </div>
          {results.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-border p-2">
              {results.map((feature) => (
                <li key={feature.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => applySearchResult(feature)}
                  >
                    {feature.place_name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

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
                  Add tags above to assign them here.
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
                      handleAddDraftTag()
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onDraftChange(null, false)
                  onSelectPlace(null)
                }}
              >
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </aside>
  )
}
