import { Sidebar } from "@phosphor-icons/react"
import { lazy, Suspense, useCallback, useMemo, useState } from "react"

import { PlacesMap } from "@/components/places-map"
import { Button } from "@/components/ui/button"
import { places as initialPlaces, tags as initialTags } from "@/lib/places"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"
import type { DraftPlace, Place } from "@/types/place"

const PlaceEditor = import.meta.env.DEV
  ? lazy(() => import("@/editor/place-editor"))
  : null

function draftToPlace(draft: DraftPlace): Place | null {
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

export function App() {
  const [places, setPlaces] = useState<Place[]>(initialPlaces)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [editorDraft, setEditorDraft] = useState<DraftPlace | null>(null)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const [importPreviewPlaces, setImportPreviewPlaces] = useState<Place[] | null>(
    null
  )
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(true)
  const resolvedTheme = useResolvedTheme()
  const isDark = resolvedTheme === "dark"

  const filteredPlaces = useMemo(() => {
    if (!activeTag) {
      return places
    }

    return places.filter((place) => place.tags.includes(activeTag))
  }, [places, activeTag])

  const displayPlaces = useMemo(() => {
    const basePlaces = import.meta.env.DEV ? places : filteredPlaces

    if (!import.meta.env.DEV || !editorDraft) {
      return basePlaces
    }

    const draftPlace = draftToPlace(editorDraft)

    if (!draftPlace) {
      return basePlaces
    }

    if (isCreatingDraft) {
      return [...basePlaces, draftPlace]
    }

    return basePlaces.map((place) =>
      place.id === draftPlace.id ? draftPlace : place
    )
  }, [places, filteredPlaces, editorDraft, isCreatingDraft])

  const handleMapClick = useCallback(
    (longitude: number, latitude: number) => {
      if (!import.meta.env.DEV || !editorDraft) {
        return
      }

      setEditorDraft({
        ...editorDraft,
        longitude: String(longitude),
        latitude: String(latitude),
      })
    },
    [editorDraft]
  )

  const handleMarkerDrag = useCallback(
    (placeId: string, longitude: number, latitude: number) => {
      if (!import.meta.env.DEV || editorDraft?.id !== placeId) {
        return
      }

      setEditorDraft({
        ...editorDraft,
        longitude: String(longitude),
        latitude: String(latitude),
      })
    },
    [editorDraft]
  )

  const handleSelectPlace = useCallback(
    (placeId: string | null) => {
      setSelectedPlaceId(placeId)

      if (
        placeId &&
        activeTag &&
        !filteredPlaces.some((place) => place.id === placeId)
      ) {
        setActiveTag(null)
      }
    },
    [activeTag, filteredPlaces]
  )

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <main className="relative min-h-0 min-w-0 flex-1">
        <PlacesMap
          places={displayPlaces}
          fitBoundsPlaces={import.meta.env.DEV ? displayPlaces : places}
          previewPlaces={importPreviewPlaces ?? undefined}
          tags={tags}
          activeTag={activeTag}
          onActiveTagChange={setActiveTag}
          isDark={isDark}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={handleSelectPlace}
          onMapClick={handleMapClick}
          onMarkerDrag={handleMarkerDrag}
          draggableMarkerId={import.meta.env.DEV ? editorDraft?.id ?? null : null}
        />

        {PlaceEditor ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-4 bottom-4 z-20 shadow-lg"
            aria-expanded={isEditorOpen}
            aria-label={isEditorOpen ? "Close editor" : "Open editor"}
            onClick={() => setIsEditorOpen((open) => !open)}
          >
            <Sidebar />
          </Button>
        ) : null}
      </main>

      {PlaceEditor && isEditorOpen ? (
        <div className="flex h-full w-sm shrink-0 flex-col overflow-hidden border-l border-border">
          <Suspense fallback={null}>
            <PlaceEditor
              places={places}
              tags={tags}
              selectedPlaceId={selectedPlaceId}
              draft={editorDraft}
              isCreating={isCreatingDraft}
              onPlacesChange={setPlaces}
              onTagsChange={setTags}
              onSelectPlace={handleSelectPlace}
              onDraftChange={(nextDraft, isCreating) => {
                setEditorDraft(nextDraft)
                setIsCreatingDraft(isCreating)
              }}
              onImportPreviewChange={setImportPreviewPlaces}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  )
}

export default App
