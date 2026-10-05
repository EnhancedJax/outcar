import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useAuth } from "@/auth"
import { fetchPlacesCatalog, fromDraft } from "@/lib/places"
import { loadPlaceImages } from "@/lib/content-repository"
import { isPathTypeValue } from "@/constants/path"
import type { CatalogTag, DraftPlace, Place, PlaceImage } from "@/types/place"

type EditorCoordinateHandler = (longitude: number, latitude: number) => void

type EditorMarkerDragHandler = (longitude: number, latitude: number) => void

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
  isCatalogLoading: boolean
  catalogError: string | null
  selectedPlaceImages: PlaceImage[]
  selectedPlaceImagesLoading: boolean
  selectedPlaceImagesError: string | null
  setPlaces: (places: Place[]) => void
  setTags: (tags: CatalogTag[]) => void
  setEditorDraft: (draft: DraftPlace | null, isCreating: boolean) => void
  setImportPreviewPlaces: (places: Place[] | null) => void
  setActiveTag: (tag: string | null) => void
  setIsEditorOpen: (open: boolean | ((open: boolean) => boolean)) => void
  selectPlace: (placeId: string | null) => void
  selectPlaceFromMap: (placeId: string) => void
  registerEditorPlaceSelect: (
    handler: ((placeId: string) => void) | null
  ) => void
  registerEditorCoordinateHandler: (
    handler: EditorCoordinateHandler | null
  ) => void
  registerEditorMarkerDragHandler: (
    handler: EditorMarkerDragHandler | null
  ) => void
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

function draftPlaceForDisplay(
  draft: DraftPlace,
  fallback: Place | undefined
): Place | null {
  const longitude = Number(draft.longitude)
  const latitude = Number(draft.latitude)
  const pathType = Number(draft.pathType)

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !isPathTypeValue(pathType)
  ) {
    return null
  }

  return {
    id: draft.id,
    name: draft.name,
    note: draft.note,
    longitude,
    latitude,
    tags: draft.tags,
    parkingCondition: fallback?.parkingCondition ?? -1,
    gmapUrl: fallback?.gmapUrl ?? null,
    pathType,
    path: pathType === -1 ? [] : draft.path,
    images: draft.images,
    hasImages: draft.images.length > 0,
  }
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const { isAuthenticated } = useAuth()
  const [places, setPlaces] = useState<Place[]>([])
  const [tags, setTags] = useState<CatalogTag[]>([])
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [selectedPlaceImages, setSelectedPlaceImages] = useState<PlaceImage[]>(
    []
  )
  const [selectedPlaceImagesLoading, setSelectedPlaceImagesLoading] =
    useState(false)
  const [selectedPlaceImagesError, setSelectedPlaceImagesError] = useState<
    string | null
  >(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [editorDraft, setEditorDraftState] = useState<DraftPlace | null>(null)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const [importPreviewPlaces, setImportPreviewPlaces] = useState<
    Place[] | null
  >(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(true)
  const editorPlaceSelectRef = useRef<((placeId: string) => void) | null>(null)
  const editorCoordinateHandlerRef = useRef<EditorCoordinateHandler | null>(
    null
  )
  const editorMarkerDragHandlerRef = useRef<EditorMarkerDragHandler | null>(
    null
  )

  useEffect(() => {
    let cancelled = false

    void fetchPlacesCatalog()
      .then((catalog) => {
        if (cancelled) return
        setPlaces(catalog.places)
        setTags(catalog.tags)
        setCatalogError(null)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error ? error.message : "Failed to load places"
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsCatalogLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const selectedPlace = places.find((place) => place.id === selectedPlaceId)

    if (!selectedPlaceId || !selectedPlace?.hasImages) {
      return
    }

    let cancelled = false

    void loadPlaceImages(selectedPlaceId)
      .then((images) => {
        if (!cancelled) setSelectedPlaceImages(images)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSelectedPlaceImagesError(
            error instanceof Error ? error.message : "Failed to load images"
          )
        }
      })
      .finally(() => {
        if (!cancelled) setSelectedPlaceImagesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [places, selectedPlaceId])

  const isEditorActive = isAuthenticated && isEditorOpen
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

    const draftPlace =
      fromDraft(editorDraft) ??
      draftPlaceForDisplay(
        editorDraft,
        places.find((place) => place.id === editorDraft.id)
      )

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
  const draggableMarkerId = isEditorActive ? (editorDraft?.id ?? null) : null

  const registerEditorCoordinateHandler = useCallback(
    (handler: EditorCoordinateHandler | null) => {
      editorCoordinateHandlerRef.current = handler
    },
    []
  )

  const registerEditorMarkerDragHandler = useCallback(
    (handler: EditorMarkerDragHandler | null) => {
      editorMarkerDragHandlerRef.current = handler
    },
    []
  )

  const handleMapClick = useCallback(
    (longitude: number, latitude: number) => {
      if (
        !isEditorActive ||
        !editorDraft ||
        !editorCoordinateHandlerRef.current
      ) {
        return
      }

      editorCoordinateHandlerRef.current(longitude, latitude)
    },
    [editorDraft, isEditorActive]
  )

  const handleMarkerDrag = useCallback(
    (placeId: string, longitude: number, latitude: number) => {
      if (!isEditorActive || editorDraft?.id !== placeId) {
        return
      }

      if (editorMarkerDragHandlerRef.current) {
        editorMarkerDragHandlerRef.current(longitude, latitude)
        return
      }

      editorCoordinateHandlerRef.current?.(longitude, latitude)
    },
    [editorDraft, isEditorActive]
  )

  const selectPlace = useCallback(
    (placeId: string | null) => {
      setSelectedPlaceId(placeId)
      setSelectedPlaceImages([])
      setSelectedPlaceImagesError(null)
      setSelectedPlaceImagesLoading(
        placeId
          ? (displayPlaces.find((place) => place.id === placeId)?.hasImages ??
              false)
          : false
      )

      if (
        placeId &&
        activeTag &&
        !filteredPlaces.some((place) => place.id === placeId)
      ) {
        setActiveTag(null)
      }
    },
    [activeTag, displayPlaces, filteredPlaces]
  )

  const registerEditorPlaceSelect = useCallback(
    (handler: ((placeId: string) => void) | null) => {
      editorPlaceSelectRef.current = handler
    },
    []
  )

  const selectPlaceFromMap = useCallback(
    (placeId: string) => {
      if (isEditorActive && editorPlaceSelectRef.current) {
        editorPlaceSelectRef.current(placeId)
        return
      }

      selectPlace(placeId)
    },
    [isEditorActive, selectPlace]
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
      isCatalogLoading,
      catalogError,
      selectedPlaceImages,
      selectedPlaceImagesLoading,
      selectedPlaceImagesError,
      setPlaces,
      setTags,
      setEditorDraft,
      setImportPreviewPlaces,
      setActiveTag,
      setIsEditorOpen,
      selectPlace,
      selectPlaceFromMap,
      registerEditorPlaceSelect,
      registerEditorCoordinateHandler,
      registerEditorMarkerDragHandler,
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
      selectPlaceFromMap,
      registerEditorPlaceSelect,
      registerEditorCoordinateHandler,
      registerEditorMarkerDragHandler,
      handleMapClick,
      handleMarkerDrag,
      isCatalogLoading,
      catalogError,
      selectedPlaceImages,
      selectedPlaceImagesLoading,
      selectedPlaceImagesError,
    ]
  )

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}
