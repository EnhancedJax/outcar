import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { useAppState } from "@/app-state"
import { searchPlaces } from "@/lib/mapbox"
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
  setTagIcon,
} from "@/lib/places"
import type { CatalogTag, DraftPlace, Place } from "@/types/place"

import {
  fromDraft,
  importPreviewToPlaces,
  toDraft,
  toggleDraftTag,
  type EditorTab,
  type ImportPreviewItem,
  type PlacesScreen,
} from "./place-editor-utils"

export type PlaceApplyError = {
  field?: keyof import("./place-editor-utils").PlaceFormValues
  message: string
}

function catalogSnapshot(tags: CatalogTag[], places: Place[]) {
  return JSON.stringify({ tags, places })
}

type PlaceEditorContextValue = {
  places: Place[]
  tags: CatalogTag[]
  selectedPlaceId: string | null
  draft: DraftPlace | null
  isCreating: boolean
  selectedPlace: Place | null
  query: string
  setQuery: (query: string) => void
  importUrl: string
  setImportUrl: (url: string) => void
  importListName: string | null
  importPreview: ImportPreviewItem[]
  newTagLabel: string
  setNewTagLabel: (label: string) => void
  draftNewTagLabel: string
  setDraftNewTagLabel: (label: string) => void
  results: Awaited<ReturnType<typeof searchPlaces>>
  isSearching: boolean
  isImporting: boolean
  isDirty: boolean
  isSaving: boolean
  error: string | null
  activeTab: EditorTab
  setActiveTab: (tab: EditorTab) => void
  placesScreen: PlacesScreen
  goToPlacesList: () => void
  onDraftChange: (draft: DraftPlace | null, isCreating: boolean) => void
  handleCommit: () => Promise<void>
  clearImportPreview: () => void
  updateImportSelection: (key: string, selected: boolean) => void
  handleAddTag: () => void
  handleDeleteTag: (tagId: string) => void
  handleMoveTag: (index: number, direction: "up" | "down") => void
  handleSetTagIcon: (tagId: string, icon: string | null) => void
  handleImportPreview: () => Promise<void>
  handleImportConfirm: () => void
  handleSearch: () => Promise<void>
  startCreate: () => void
  startEdit: (place: Place) => void
  applySearchResult: (
    feature: Awaited<ReturnType<typeof searchPlaces>>[number]
  ) => void
  handleApply: (values: DraftPlace) => PlaceApplyError | null
  handleDelete: (placeId: string) => void
  handleToggleDraftTag: (tagId: string) => void
  handleAddDraftTag: () => void
}

const PlaceEditorContext = createContext<PlaceEditorContextValue | null>(null)

export function usePlaceEditor() {
  const context = useContext(PlaceEditorContext)

  if (!context) {
    throw new Error("usePlaceEditor must be used within PlaceEditorProvider")
  }

  return context
}

type PlaceEditorProviderProps = {
  children: ReactNode
}

export function PlaceEditorProvider({ children }: PlaceEditorProviderProps) {
  const {
    places,
    tags,
    selectedPlaceId,
    editorDraft: draft,
    isCreatingDraft: isCreating,
    setPlaces,
    setTags,
    setEditorDraft: onDraftChange,
    setImportPreviewPlaces,
    selectPlace: onSelectPlace,
  } = useAppState()

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
  const [committedSnapshot, setCommittedSnapshot] = useState(() =>
    catalogSnapshot(tags, places)
  )
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>("places")
  const [placesScreen, setPlacesScreen] = useState<PlacesScreen>("list")

  const isDirty = catalogSnapshot(tags, places) !== committedSnapshot

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ?? null

  useEffect(() => {
    if (importPreview.length === 0) {
      setImportPreviewPlaces(null)
      return
    }

    setImportPreviewPlaces(importPreviewToPlaces(importPreview))
  }, [importPreview, setImportPreviewPlaces])

  const applyCatalog = useCallback(
    (nextTags: CatalogTag[], nextPlaces: Place[]) => {
      setTags(nextTags)
      setPlaces(nextPlaces)
    },
    [setPlaces, setTags]
  )

  const handleCommit = useCallback(async () => {
    if (!isDirty) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await savePlacesCatalog({ tags, places })
      setCommittedSnapshot(catalogSnapshot(tags, places))
    } catch (commitError) {
      setError(
        commitError instanceof Error
          ? commitError.message
          : "Failed to save places"
      )
    } finally {
      setIsSaving(false)
    }
  }, [isDirty, places, tags])

  const clearImportPreview = useCallback(() => {
    setImportListName(null)
    setImportPreview([])
    setImportUrl("")
  }, [])

  const updateImportSelection = useCallback(
    (key: string, selected: boolean) => {
      setImportPreview((current) =>
        current.map((item) =>
          item.key === key && !item.alreadyExists ? { ...item, selected } : item
        )
      )
    },
    []
  )

  const handleAddTag = useCallback(() => {
    const nextTags = addTagToCatalog(tags, newTagLabel)

    if (!nextTags) {
      setError("Enter a unique tag label.")
      return
    }

    applyCatalog(nextTags, places)
    setNewTagLabel("")
  }, [applyCatalog, newTagLabel, places, tags])

  const handleDeleteTag = useCallback(
    (tagId: string) => {
      const nextTags = removeTagFromCatalog(tags, tagId)
      const nextPlaces = removeTagFromPlaces(places, tagId)
      applyCatalog(nextTags, nextPlaces)

      if (draft) {
        onDraftChange(toggleDraftTag(draft, tagId), isCreating)
      }
    },
    [applyCatalog, draft, isCreating, onDraftChange, places, tags]
  )

  const handleSetTagIcon = useCallback(
    (tagId: string, icon: string | null) => {
      const nextTags = setTagIcon(tags, tagId, icon)
      applyCatalog(nextTags, places)
    },
    [applyCatalog, places, tags]
  )

  const handleMoveTag = useCallback(
    (index: number, direction: "up" | "down") => {
      const targetIndex = direction === "up" ? index - 1 : index + 1
      const nextTags = moveTag(tags, index, targetIndex)
      applyCatalog(nextTags, places)
    },
    [applyCatalog, places, tags]
  )

  const handleImportPreview = useCallback(async () => {
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
  }, [clearImportPreview, importUrl, places])

  const handleImportConfirm = useCallback(() => {
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
        parkingCondition: -1,
        gmapUrl: null,
      }
    })

    applyCatalog(tags, [...places, ...importedPlaces])
    clearImportPreview()
  }, [applyCatalog, clearImportPreview, importPreview, places, tags])

  const handleSearch = useCallback(async () => {
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
  }, [query])

  const goToPlacesList = useCallback(() => {
    onDraftChange(null, false)
    onSelectPlace(null)
    setPlacesScreen("list")
  }, [onDraftChange, onSelectPlace])

  const startCreate = useCallback(() => {
    onDraftChange(
      {
        id: `draft-${Date.now()}`,
        name: "",
        note: "",
        longitude: "139.7",
        latitude: "35.68",
        tags: [],
        parkingCondition: "-1",
        gmapUrl: "",
      },
      true
    )
    onSelectPlace(null)
    setActiveTab("places")
    setPlacesScreen("form")
  }, [onDraftChange, onSelectPlace])

  const startEdit = useCallback(
    (place: Place) => {
      onDraftChange(toDraft(place), false)
      onSelectPlace(place.id)
      setActiveTab("places")
      setPlacesScreen("form")
    },
    [onDraftChange, onSelectPlace]
  )

  const applySearchResult = useCallback(
    (feature: Awaited<ReturnType<typeof searchPlaces>>[number]) => {
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
              parkingCondition: "-1",
              gmapUrl: "",
            })

      onDraftChange(
        {
          ...base,
          name: base.name || feature.place_name,
          id: base.id || createPlaceId(feature.place_name),
          longitude: String(longitude),
          latitude: String(latitude),
        },
        draft ? isCreating : !selectedPlace
      )
      setActiveTab("places")
      setPlacesScreen("form")
    },
    [draft, isCreating, onDraftChange, selectedPlace]
  )

  const handleApply = useCallback(
    (values: DraftPlace): PlaceApplyError | null => {
      const nextPlace = fromDraft(values)

      if (!nextPlace) {
        return { message: "Fill in name and valid coordinates before saving." }
      }

      const duplicateId = places.some(
        (place) =>
          place.id === nextPlace.id &&
          place.id !== (selectedPlace?.id ?? values.id)
      )

      if (duplicateId) {
        return { field: "id", message: "A place with this id already exists." }
      }

      const nextPlaces = isCreating
        ? [...places, nextPlace]
        : places.map((place) =>
            place.id === selectedPlace?.id ? nextPlace : place
          )

      applyCatalog(tags, nextPlaces)
      onDraftChange(null, false)
      onSelectPlace(nextPlace.id)
      setPlacesScreen("list")
      setResults([])
      setQuery("")

      return null
    },
    [
      applyCatalog,
      isCreating,
      onDraftChange,
      onSelectPlace,
      places,
      selectedPlace,
      tags,
    ]
  )

  const handleDelete = useCallback(
    (placeId: string) => {
      const nextPlaces = places.filter((place) => place.id !== placeId)
      applyCatalog(tags, nextPlaces)

      if (selectedPlaceId === placeId) {
        onSelectPlace(null)
        onDraftChange(null, false)
        setPlacesScreen("list")
      }
    },
    [
      applyCatalog,
      onDraftChange,
      onSelectPlace,
      places,
      selectedPlaceId,
      tags,
    ]
  )

  const handleToggleDraftTag = useCallback(
    (tagId: string) => {
      if (!draft) {
        return
      }

      onDraftChange(toggleDraftTag(draft, tagId), isCreating)
    },
    [draft, isCreating, onDraftChange]
  )

  const handleAddDraftTag = useCallback(() => {
    if (!draft) {
      return
    }

    const nextTags = addTagToCatalog(tags, draftNewTagLabel)

    if (!nextTags) {
      setError("Enter a unique tag label.")
      return
    }

    const addedTag = nextTags[nextTags.length - 1]
    applyCatalog(nextTags, places)
    onDraftChange(
      {
        ...draft,
        tags: draft.tags.includes(addedTag.id)
          ? draft.tags
          : [...draft.tags, addedTag.id],
      },
      isCreating
    )
    setDraftNewTagLabel("")
  }, [
    applyCatalog,
    draft,
    draftNewTagLabel,
    isCreating,
    onDraftChange,
    places,
    tags,
  ])

  const value = useMemo<PlaceEditorContextValue>(
    () => ({
      places,
      tags,
      selectedPlaceId,
      draft,
      isCreating,
      selectedPlace,
      query,
      setQuery,
      importUrl,
      setImportUrl,
      importListName,
      importPreview,
      newTagLabel,
      setNewTagLabel,
      draftNewTagLabel,
      setDraftNewTagLabel,
      results,
      isSearching,
      isImporting,
      isDirty,
      isSaving,
      error,
      activeTab,
      setActiveTab,
      placesScreen,
      goToPlacesList,
      onDraftChange,
      handleCommit,
      clearImportPreview,
      updateImportSelection,
      handleAddTag,
      handleDeleteTag,
      handleMoveTag,
      handleSetTagIcon,
      handleImportPreview,
      handleImportConfirm,
      handleSearch,
      startCreate,
      startEdit,
      applySearchResult,
      handleApply,
      handleDelete,
      handleToggleDraftTag,
      handleAddDraftTag,
    }),
    [
      activeTab,
      applySearchResult,
      clearImportPreview,
      goToPlacesList,
      draft,
      draftNewTagLabel,
      error,
      handleAddDraftTag,
      handleAddTag,
      handleDelete,
      handleDeleteTag,
      handleSetTagIcon,
      handleImportConfirm,
      handleImportPreview,
      handleMoveTag,
      handleApply,
      handleCommit,
      handleSearch,
      handleToggleDraftTag,
      importListName,
      importPreview,
      importUrl,
      isCreating,
      isDirty,
      isImporting,
      isSaving,
      isSearching,
      newTagLabel,
      onDraftChange,
      places,
      placesScreen,
      query,
      results,
      selectedPlace,
      selectedPlaceId,
      startCreate,
      startEdit,
      tags,
      updateImportSelection,
    ]
  )

  return (
    <PlaceEditorContext.Provider value={value}>
      {children}
    </PlaceEditorContext.Provider>
  )
}
