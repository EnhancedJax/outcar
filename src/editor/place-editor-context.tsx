import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

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

import {
  fromDraft,
  importPreviewToPlaces,
  toDraft,
  toggleDraftTag,
  type EditorTab,
  type ImportPreviewItem,
} from "./place-editor-utils"

export type PlaceEditorProps = {
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

type PlaceEditorContextValue = {
  places: Place[]
  tags: string[]
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
  isSaving: boolean
  error: string | null
  activeTab: EditorTab
  setActiveTab: (tab: EditorTab) => void
  onDraftChange: (draft: DraftPlace | null, isCreating: boolean) => void
  persistCatalog: (nextTags: string[], nextPlaces: Place[]) => Promise<void>
  clearImportPreview: () => void
  updateImportSelection: (key: string, selected: boolean) => void
  handleAddTag: () => Promise<void>
  handleDeleteTag: (tag: string) => Promise<void>
  handleMoveTag: (index: number, direction: "up" | "down") => Promise<void>
  handleImportPreview: () => Promise<void>
  handleImportConfirm: () => Promise<void>
  handleSearch: () => Promise<void>
  startCreate: () => void
  startEdit: (place: Place) => void
  applySearchResult: (
    feature: Awaited<ReturnType<typeof searchPlaces>>[number]
  ) => void
  handleSave: () => Promise<void>
  handleDelete: (placeId: string) => Promise<void>
  handleToggleDraftTag: (tag: string) => void
  handleAddDraftTag: () => Promise<void>
  cancelDraft: () => void
}

const PlaceEditorContext = createContext<PlaceEditorContextValue | null>(null)

export function usePlaceEditor() {
  const context = useContext(PlaceEditorContext)

  if (!context) {
    throw new Error("usePlaceEditor must be used within PlaceEditorProvider")
  }

  return context
}

type PlaceEditorProviderProps = PlaceEditorProps & {
  children: ReactNode
}

export function PlaceEditorProvider({
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
  children,
}: PlaceEditorProviderProps) {
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
  const [activeTab, setActiveTab] = useState<EditorTab>("places")

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ?? null

  useEffect(() => {
    if (importPreview.length === 0) {
      onImportPreviewChange(null)
      return
    }

    onImportPreviewChange(importPreviewToPlaces(importPreview))
  }, [importPreview, onImportPreviewChange])

  const persistCatalog = useCallback(
    async (nextTags: string[], nextPlaces: Place[]) => {
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
    },
    [onPlacesChange, onTagsChange]
  )

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

  const handleAddTag = useCallback(async () => {
    const nextTags = addTagToCatalog(tags, newTagLabel)

    if (!nextTags) {
      setError("Enter a unique tag label.")
      return
    }

    await persistCatalog(nextTags, places)
    setNewTagLabel("")
  }, [newTagLabel, persistCatalog, places, tags])

  const handleDeleteTag = useCallback(
    async (tag: string) => {
      const nextTags = removeTagFromCatalog(tags, tag)
      const nextPlaces = removeTagFromPlaces(places, tag)
      await persistCatalog(nextTags, nextPlaces)

      if (draft) {
        onDraftChange(toggleDraftTag(draft, tag), isCreating)
      }
    },
    [draft, isCreating, onDraftChange, persistCatalog, places, tags]
  )

  const handleMoveTag = useCallback(
    async (index: number, direction: "up" | "down") => {
      const targetIndex = direction === "up" ? index - 1 : index + 1
      const nextTags = moveTag(tags, index, targetIndex)
      await persistCatalog(nextTags, places)
    },
    [persistCatalog, places, tags]
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

  const handleImportConfirm = useCallback(async () => {
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
  }, [clearImportPreview, importPreview, persistCatalog, places, tags])

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

  const startCreate = useCallback(() => {
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
    setActiveTab("places")
  }, [onDraftChange, onSelectPlace])

  const startEdit = useCallback(
    (place: Place) => {
      onDraftChange(toDraft(place), false)
      onSelectPlace(place.id)
      setActiveTab("places")
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
    },
    [draft, isCreating, onDraftChange, selectedPlace]
  )

  const handleSave = useCallback(async () => {
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
  }, [
    draft,
    isCreating,
    onDraftChange,
    onSelectPlace,
    persistCatalog,
    places,
    selectedPlace,
    tags,
  ])

  const handleDelete = useCallback(
    async (placeId: string) => {
      const nextPlaces = places.filter((place) => place.id !== placeId)
      await persistCatalog(tags, nextPlaces)

      if (selectedPlaceId === placeId) {
        onSelectPlace(null)
        onDraftChange(null, false)
      }
    },
    [
      onDraftChange,
      onSelectPlace,
      persistCatalog,
      places,
      selectedPlaceId,
      tags,
    ]
  )

  const handleToggleDraftTag = useCallback(
    (tag: string) => {
      if (!draft) {
        return
      }

      onDraftChange(toggleDraftTag(draft, tag), isCreating)
    },
    [draft, isCreating, onDraftChange]
  )

  const handleAddDraftTag = useCallback(async () => {
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
  }, [draft, draftNewTagLabel, isCreating, onDraftChange, persistCatalog, places, tags])

  const cancelDraft = useCallback(() => {
    onDraftChange(null, false)
    onSelectPlace(null)
  }, [onDraftChange, onSelectPlace])

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
      isSaving,
      error,
      activeTab,
      setActiveTab,
      onDraftChange,
      persistCatalog,
      clearImportPreview,
      updateImportSelection,
      handleAddTag,
      handleDeleteTag,
      handleMoveTag,
      handleImportPreview,
      handleImportConfirm,
      handleSearch,
      startCreate,
      startEdit,
      applySearchResult,
      handleSave,
      handleDelete,
      handleToggleDraftTag,
      handleAddDraftTag,
      cancelDraft,
    }),
    [
      activeTab,
      applySearchResult,
      cancelDraft,
      clearImportPreview,
      draft,
      draftNewTagLabel,
      error,
      handleAddDraftTag,
      handleAddTag,
      handleDelete,
      handleDeleteTag,
      handleImportConfirm,
      handleImportPreview,
      handleMoveTag,
      handleSave,
      handleSearch,
      handleToggleDraftTag,
      importListName,
      importPreview,
      importUrl,
      isCreating,
      isImporting,
      isSaving,
      isSearching,
      newTagLabel,
      onDraftChange,
      persistCatalog,
      places,
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
