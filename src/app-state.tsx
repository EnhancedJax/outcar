import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { places as initialPlaces, tags as initialTags } from "@/lib/places"
import type { CatalogTag, DraftPlace, Place } from "@/types/place"

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

type AppStateContextValue = {
  places: Place[]
  tags: CatalogTag[]
  selectedPlaceId: string | null
  editorDraft: DraftPlace | null
  isCreatingDraft: boolean
  importPreviewPlaces: Place[] | null
  activeTag: string | null
  isEditorOpen: boolean
  isEditorActive: boolean
  viewerMode: boolean
  filteredPlaces: Place[]
  displayPlaces: Place[]
  fitBoundsPlaces: Place[]
  draggableMarkerId: string | null
  setPlaces: (places: Place[]) => void
  setTags: (tags: CatalogTag[]) => void
  setEditorDraft: (draft: DraftPlace | null, isCreating: boolean) => void
  setImportPreviewPlaces: (places: Place[] | null) => void
  setActiveTag: (tag: string | null) => void
  setIsEditorOpen: (open: boolean | ((open: boolean) => boolean)) => void
  selectPlace: (placeId: string | null) => void
  handleMapClick: (longitude: number, latitude: number) => void
  handleMarkerDrag: (
    placeId: string,
    longitude: number,
    latitude: number
  ) => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function useAppState() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider")
  }

  return context
}

type AppStateProviderProps = {
  children: ReactNode
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces)
  const [tags, setTags] = useState<CatalogTag[]>(initialTags)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [editorDraft, setEditorDraftState] = useState<DraftPlace | null>(null)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const [importPreviewPlaces, setImportPreviewPlaces] = useState<Place[] | null>(
    null
  )
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(true)

  const isEditorActive = import.meta.env.DEV && isEditorOpen
  const viewerMode = !isEditorActive

  const setEditorDraft = useCallback(
    (draft: DraftPlace | null, isCreating: boolean) => {
      setEditorDraftState(draft)
      setIsCreatingDraft(isCreating)
    },
    []
  )

  const filteredPlaces = useMemo(() => {
    if (!activeTag) {
      return places
    }

    return places.filter((place) => place.tags.includes(activeTag))
  }, [places, activeTag])

  const displayPlaces = useMemo(() => {
    const basePlaces = isEditorActive ? places : filteredPlaces

    if (!isEditorActive || !editorDraft) {
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
  }, [places, filteredPlaces, editorDraft, isCreatingDraft, isEditorActive])

  const fitBoundsPlaces = isEditorActive ? displayPlaces : places
  const draggableMarkerId = isEditorActive ? editorDraft?.id ?? null : null

  const handleMapClick = useCallback(
    (longitude: number, latitude: number) => {
      if (!isEditorActive || !editorDraft) {
        return
      }

      setEditorDraftState({
        ...editorDraft,
        longitude: String(longitude),
        latitude: String(latitude),
      })
    },
    [editorDraft, isEditorActive]
  )

  const handleMarkerDrag = useCallback(
    (placeId: string, longitude: number, latitude: number) => {
      if (!isEditorActive || editorDraft?.id !== placeId) {
        return
      }

      setEditorDraftState({
        ...editorDraft,
        longitude: String(longitude),
        latitude: String(latitude),
      })
    },
    [editorDraft, isEditorActive]
  )

  const selectPlace = useCallback(
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

  const value = useMemo<AppStateContextValue>(
    () => ({
      places,
      tags,
      selectedPlaceId,
      editorDraft,
      isCreatingDraft,
      importPreviewPlaces,
      activeTag,
      isEditorOpen,
      isEditorActive,
      viewerMode,
      filteredPlaces,
      displayPlaces,
      fitBoundsPlaces,
      draggableMarkerId,
      setPlaces,
      setTags,
      setEditorDraft,
      setImportPreviewPlaces,
      setActiveTag,
      setIsEditorOpen,
      selectPlace,
      handleMapClick,
      handleMarkerDrag,
    }),
    [
      places,
      tags,
      selectedPlaceId,
      editorDraft,
      isCreatingDraft,
      importPreviewPlaces,
      activeTag,
      isEditorOpen,
      isEditorActive,
      viewerMode,
      filteredPlaces,
      displayPlaces,
      fitBoundsPlaces,
      draggableMarkerId,
      setEditorDraft,
      selectPlace,
      handleMapClick,
      handleMarkerDrag,
    ]
  )

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}
