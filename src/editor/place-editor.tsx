import { useState } from "react"
import { MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createPlaceId, savePlaces } from "@/lib/places"
import { searchPlaces } from "@/lib/mapbox"
import type { DraftPlace, Place } from "@/types/place"

type PlaceEditorProps = {
  places: Place[]
  selectedPlaceId: string | null
  draft: DraftPlace | null
  isCreating: boolean
  onPlacesChange: (places: Place[]) => void
  onSelectPlace: (placeId: string | null) => void
  onDraftChange: (draft: DraftPlace | null, isCreating: boolean) => void
}

function toDraft(place: Place): DraftPlace {
  return {
    id: place.id,
    name: place.name,
    note: place.note,
    longitude: String(place.longitude),
    latitude: String(place.latitude),
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
  }
}

export default function PlaceEditor({
  places,
  selectedPlaceId,
  draft,
  isCreating,
  onPlacesChange,
  onSelectPlace,
  onDraftChange,
}: PlaceEditorProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof searchPlaces>>
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ?? null

  async function persist(nextPlaces: Place[]) {
    setIsSaving(true)
    setError(null)

    try {
      await savePlaces(nextPlaces)
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

    await persist(nextPlaces)
    onDraftChange(null, false)
    onSelectPlace(nextPlace.id)
    setResults([])
    setQuery("")
  }

  async function handleDelete(placeId: string) {
    const nextPlaces = places.filter((place) => place.id !== placeId)
    await persist(nextPlaces)

    if (selectedPlaceId === placeId) {
      onSelectPlace(null)
      onDraftChange(null, false)
    }
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
