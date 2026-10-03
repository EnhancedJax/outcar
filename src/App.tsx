import { lazy, Suspense, useCallback, useMemo, useState } from "react"

import { PlacesMap } from "@/components/places-map"
import { places as initialPlaces } from "@/lib/places"
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
  }
}

export function App() {
  const [places, setPlaces] = useState<Place[]>(initialPlaces)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [editorDraft, setEditorDraft] = useState<DraftPlace | null>(null)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const resolvedTheme = useResolvedTheme()
  const isDark = resolvedTheme === "dark"

  const displayPlaces = useMemo(() => {
    if (!import.meta.env.DEV || !editorDraft) {
      return places
    }

    const draftPlace = draftToPlace(editorDraft)

    if (!draftPlace) {
      return places
    }

    if (isCreatingDraft) {
      return [...places, draftPlace]
    }

    return places.map((place) =>
      place.id === draftPlace.id ? draftPlace : place
    )
  }, [places, editorDraft, isCreatingDraft])

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

  return (
    <div className="flex h-svh w-full">
      <main className="min-w-0 flex-1">
        <PlacesMap
          places={displayPlaces}
          isDark={isDark}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          onMapClick={handleMapClick}
          onMarkerDrag={handleMarkerDrag}
          draggableMarkerId={import.meta.env.DEV ? editorDraft?.id ?? null : null}
        />
      </main>

      {PlaceEditor ? (
        <Suspense fallback={null}>
          <PlaceEditor
            places={places}
            selectedPlaceId={selectedPlaceId}
            draft={editorDraft}
            isCreating={isCreatingDraft}
            onPlacesChange={setPlaces}
            onSelectPlace={setSelectedPlaceId}
            onDraftChange={(nextDraft, isCreating) => {
              setEditorDraft(nextDraft)
              setIsCreatingDraft(isCreating)
            }}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

export default App
