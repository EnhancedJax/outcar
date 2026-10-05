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
import { FormProvider, useForm } from "react-hook-form"

import { useAppState } from "@/app-state"
import { isPathTypeValue, type PathTypeValue } from "@/constants/path"
import { fetchDirections } from "@/lib/mapbox"
import { pathAnchoredAtPin, reversePath } from "@/lib/path"
import {
  addTagToCatalog,
  createEmptyDraft,
  createUniquePlaceId,
  fetchGoogleMapsList,
  createPlaceImage,
  fromDraft,
  moveTag,
  placeAlreadyExists,
  removeTagFromCatalog,
  removeTagFromPlaces,
  savePlacesCatalog,
  setTagColor,
  setTagIcon,
  setTagShowOnMap,
  toDraft,
  validatePathForDraft,
} from "@/lib/places"
import { loadPlaceImages } from "@/lib/content-repository"
import type { CatalogTag, DraftPlace, Place, PlaceImage } from "@/types/place"

import {
  importPreviewToPlaces,
  toggleDraftTag,
  type EditorTab,
  type ImportPreviewItem,
  type PlacesScreen,
} from "./place-editor-utils"

export type PlaceApplyError = {
  field?: keyof DraftPlace
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
  isImporting: boolean
  isDirty: boolean
  isSaving: boolean
  error: string | null
  activeTab: EditorTab
  setActiveTab: (tab: EditorTab) => void
  placesScreen: PlacesScreen
  hasNextPlace: boolean
  goToPlacesList: () => void
  handleCommit: () => Promise<void>
  clearImportPreview: () => void
  updateImportSelection: (key: string, selected: boolean) => void
  handleAddTag: () => void
  handleDeleteTag: (tagId: string) => void
  handleMoveTag: (index: number, direction: "up" | "down") => void
  handleSetTagIcon: (tagId: string, icon: string | null) => void
  handleSetTagColor: (tagId: string, color: string | null) => void
  handleSetTagShowOnMap: (tagId: string, showOnMap: boolean) => void
  handleImportPreview: () => Promise<void>
  handleImportConfirm: () => void
  startCreate: () => void
  startEdit: (place: Place) => void
  handleImageFiles: (files: FileList | File[]) => Promise<void>
  moveDraftImage: (index: number, direction: "up" | "down") => void
  deleteDraftImage: (index: number) => void
  handleApply: (
    values: DraftPlace,
    options?: { advance?: boolean }
  ) => PlaceApplyError | null
  handleDelete: (placeId: string) => void
  handleToggleDraftTag: (tagId: string) => void
  handleAddDraftTag: () => void
  pathDrawMode: "roads" | "points" | null
  isFetchingPath: boolean
  pathDrawingError: string | null
  setPathDrawMode: (mode: "roads" | "points" | null) => void
  handlePathTypeChange: (pathType: string) => void
  clearPath: () => void
  undoPathPoint: () => void
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
    registerEditorPlaceSelect,
    registerEditorCoordinateHandler,
    registerEditorMarkerDragHandler,
  } = useAppState()

  const isCreatingRef = useRef(false)
  const formMethods = useForm<DraftPlace>({
    defaultValues: createEmptyDraft(),
    mode: "onSubmit",
  })
  const { reset, watch, setValue, getValues } = formMethods

  const [query, setQuery] = useState("")
  const [importUrl, setImportUrl] = useState("")
  const [importListName, setImportListName] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([])
  const [newTagLabel, setNewTagLabel] = useState("")
  const [draftNewTagLabel, setDraftNewTagLabel] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [committedSnapshot, setCommittedSnapshot] = useState(() =>
    catalogSnapshot(tags, places)
  )
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>("places")
  const [placesScreen, setPlacesScreen] = useState<PlacesScreen>("list")
  const [pathDrawMode, setPathDrawModeState] = useState<
    "roads" | "points" | null
  >(null)
  const [isFetchingPath, setIsFetchingPath] = useState(false)
  const [pathDrawingError, setPathDrawingError] = useState<string | null>(null)
  const pathDrawModeRef = useRef<"roads" | "points" | null>(null)

  const isDirty = catalogSnapshot(tags, places) !== committedSnapshot

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ?? null
  const selectedPlaceIndex = selectedPlace
    ? places.findIndex((place) => place.id === selectedPlace.id)
    : -1
  const hasNextPlace =
    !isCreating &&
    selectedPlaceIndex >= 0 &&
    selectedPlaceIndex < places.length - 1

  const setPathDrawMode = useCallback((mode: "roads" | "points" | null) => {
    pathDrawModeRef.current = mode
    setPathDrawModeState(mode)
    setPathDrawingError(null)
  }, [])

  const openPlaceForm = useCallback(
    (nextDraft: DraftPlace, creating: boolean) => {
      isCreatingRef.current = creating
      reset(nextDraft)
      onDraftChange(nextDraft, creating)
      setActiveTab("places")
      setPlacesScreen("form")
      pathDrawModeRef.current = null
      setPathDrawModeState(null)
      setPathDrawingError(null)
      setIsFetchingPath(false)
    },
    [onDraftChange, reset]
  )

  useEffect(() => {
    if (placesScreen !== "form") {
      return
    }

    const subscription = watch((values) => {
      onDraftChange(values as DraftPlace, isCreatingRef.current)
    })

    return () => subscription.unsubscribe()
  }, [onDraftChange, placesScreen, watch])

  const handlePathMapClick = useCallback(
    async (longitude: number, latitude: number, mode: "roads" | "points") => {
      const values = getValues()
      const pathType = Number(values.pathType) as PathTypeValue

      if (pathType === -1) {
        return
      }

      const pinLongitude = Number(values.longitude)
      const pinLatitude = Number(values.latitude)
      const pin: [number, number] = [pinLongitude, pinLatitude]
      const click: [number, number] = [longitude, latitude]

      setPathDrawingError(null)

      if (mode === "points") {
        const nextPath =
          pathType === 0
            ? [...values.path.slice(0, -1), click, pin]
            : values.path.length === 0
              ? [pin, click]
              : [pin, ...values.path.slice(1), click]

        setValue(
          "path",
          pathAnchoredAtPin(pathType, pinLongitude, pinLatitude, nextPath)
        )
        return
      }

      setIsFetchingPath(true)

      try {
        const profile = pathType === 0 ? "driving" : "walking"
        const hasExistingPath = values.path.length > 0
        const route =
          pathType === 0
            ? await fetchDirections(
                profile,
                click,
                hasExistingPath ? values.path[0] : pin
              )
            : await fetchDirections(
                profile,
                hasExistingPath ? values.path[values.path.length - 1] : pin,
                click
              )
        const nextPath =
          pathType === 0 && hasExistingPath
            ? [...route.slice(0, -1), ...values.path]
            : pathType === 1 && hasExistingPath
              ? [...values.path, ...route.slice(1)]
              : route

        setValue(
          "path",
          pathAnchoredAtPin(pathType, pinLongitude, pinLatitude, nextPath)
        )
      } catch (routeError) {
        setPathDrawingError(
          routeError instanceof Error
            ? routeError.message
            : "Failed to fetch route"
        )
      } finally {
        setIsFetchingPath(false)
      }
    },
    [getValues, setValue]
  )

  const snapPathToPin = useCallback(
    (longitude: number, latitude: number) => {
      setValue("longitude", String(longitude))
      setValue("latitude", String(latitude))

      const pathType = Number(getValues("pathType"))
      const path = getValues("path")

      if (isPathTypeValue(pathType) && pathType !== -1 && path.length > 0) {
        setValue("path", pathAnchoredAtPin(pathType, longitude, latitude, path))
      }
    },
    [getValues, setValue]
  )

  useEffect(() => {
    if (placesScreen !== "form") {
      registerEditorCoordinateHandler(null)
      registerEditorMarkerDragHandler(null)
      return
    }

    registerEditorCoordinateHandler((longitude, latitude) => {
      const drawMode = pathDrawModeRef.current

      if (drawMode) {
        void handlePathMapClick(longitude, latitude, drawMode)
        return
      }

      snapPathToPin(longitude, latitude)
    })

    registerEditorMarkerDragHandler(snapPathToPin)

    return () => {
      registerEditorCoordinateHandler(null)
      registerEditorMarkerDragHandler(null)
    }
  }, [
    handlePathMapClick,
    placesScreen,
    registerEditorCoordinateHandler,
    registerEditorMarkerDragHandler,
    snapPathToPin,
  ])

  useEffect(() => {
    registerEditorPlaceSelect((placeId) => {
      const place = places.find((item) => item.id === placeId)

      if (place) {
        openPlaceForm(toDraft(place), false)
        onSelectPlace(place.id)
      }
    })

    return () => registerEditorPlaceSelect(null)
  }, [onSelectPlace, openPlaceForm, places, registerEditorPlaceSelect])

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

      if (placesScreen === "form") {
        const currentDraft = getValues()
        setValue("tags", toggleDraftTag(currentDraft, tagId).tags)
      }
    },
    [applyCatalog, getValues, places, placesScreen, setValue, tags]
  )

  const handleSetTagIcon = useCallback(
    (tagId: string, icon: string | null) => {
      const nextTags = setTagIcon(tags, tagId, icon)
      applyCatalog(nextTags, places)
    },
    [applyCatalog, places, tags]
  )

  const handleSetTagColor = useCallback(
    (tagId: string, color: string | null) => {
      const nextTags = setTagColor(tags, tagId, color)
      applyCatalog(nextTags, places)
    },
    [applyCatalog, places, tags]
  )

  const handleSetTagShowOnMap = useCallback(
    (tagId: string, showOnMap: boolean) => {
      const nextTags = setTagShowOnMap(tags, tagId, showOnMap)
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
        pathType: -1,
        path: [],
        images: [],
      }
    })

    applyCatalog(tags, [...places, ...importedPlaces])
    clearImportPreview()
  }, [applyCatalog, clearImportPreview, importPreview, places, tags])

  const goToPlacesList = useCallback(() => {
    setPlacesScreen("list")
    isCreatingRef.current = false
    onDraftChange(null, false)
    onSelectPlace(null)
  }, [onDraftChange, onSelectPlace])

  const startCreate = useCallback(() => {
    openPlaceForm(createEmptyDraft(), true)
    onSelectPlace(null)
  }, [onSelectPlace, openPlaceForm])

  const startEdit = useCallback(
    async (place: Place) => {
      let images: PlaceImage[] = []
      try {
        images = await loadPlaceImages(place.id)
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load images"
        )
      }
      openPlaceForm(toDraft({ ...place, images }), false)
      onSelectPlace(place.id)
    },
    [onSelectPlace, openPlaceForm]
  )

  const handleImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const nextImages: PlaceImage[] = []

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError(`Unsupported image file: ${file.name}`)
          continue
        }

        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.addEventListener("load", () => {
              if (typeof reader.result === "string") resolve(reader.result)
              else reject(new Error(`Failed to read image: ${file.name}`))
            })
            reader.addEventListener("error", () =>
              reject(
                reader.error ?? new Error(`Failed to read image: ${file.name}`)
              )
            )
            reader.readAsDataURL(file)
          })
          nextImages.push(createPlaceImage(dataUrl))
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : `Failed to read ${file.name}`
          )
        }
      }

      if (nextImages.length > 0) {
        setValue("images", [...getValues("images"), ...nextImages])
      }
    },
    [getValues, setError, setValue]
  )

  const moveDraftImage = useCallback(
    (index: number, direction: "up" | "down") => {
      const images = [...getValues("images")]
      const target = direction === "up" ? index - 1 : index + 1
      if (index < 0 || target < 0 || target >= images.length) return
      ;[images[index], images[target]] = [images[target], images[index]]
      setValue("images", images)
    },
    [getValues, setValue]
  )

  const deleteDraftImage = useCallback(
    (index: number) => {
      setValue(
        "images",
        getValues("images").filter((_, imageIndex) => imageIndex !== index)
      )
    },
    [getValues, setValue]
  )

  const clearPath = useCallback(() => {
    setValue("pathType", "-1")
    setValue("path", [])
    setPathDrawMode(null)
    setPathDrawingError(null)
  }, [setPathDrawMode, setValue])

  const undoPathPoint = useCallback(() => {
    const values = getValues()
    const pathType = Number(values.pathType)

    if (
      !isPathTypeValue(pathType) ||
      pathType === -1 ||
      values.path.length < 2
    ) {
      return
    }

    const pinLongitude = Number(values.longitude)
    const pinLatitude = Number(values.latitude)

    if (pathType === 0) {
      if (values.path.length <= 2) {
        setValue("path", [])
        return
      }

      const nextPath = values.path.slice(0, -2)
      setValue(
        "path",
        pathAnchoredAtPin(pathType, pinLongitude, pinLatitude, [
          ...nextPath,
          [pinLongitude, pinLatitude],
        ])
      )
      return
    }

    if (values.path.length <= 2) {
      setValue("path", [])
      return
    }

    setValue(
      "path",
      pathAnchoredAtPin(pathType, pinLongitude, pinLatitude, [
        [pinLongitude, pinLatitude],
        ...values.path.slice(1, -1),
      ])
    )
  }, [getValues, setValue])

  const handlePathTypeChange = useCallback(
    (nextPathType: string) => {
      const pathType = Number(nextPathType) as PathTypeValue
      const values = getValues()
      const pinLongitude = Number(values.longitude)
      const pinLatitude = Number(values.latitude)

      setValue("pathType", nextPathType)
      setPathDrawingError(null)

      if (pathType === -1) {
        setValue("path", [])
        setPathDrawMode(null)
        return
      }

      const currentPathType = Number(values.pathType)

      if (
        values.path.length > 0 &&
        currentPathType !== -1 &&
        currentPathType !== pathType
      ) {
        setValue(
          "path",
          pathAnchoredAtPin(
            pathType,
            pinLongitude,
            pinLatitude,
            reversePath(values.path)
          )
        )
        return
      }

      if (values.path.length === 0) {
        setValue("path", [])
      }
    },
    [getValues, setPathDrawMode, setValue]
  )

  const handleApply = useCallback(
    (
      values: DraftPlace,
      options?: { advance?: boolean }
    ): PlaceApplyError | null => {
      const pathValidation = validatePathForDraft(values)

      if (pathValidation !== true) {
        return { field: "pathType", message: pathValidation }
      }

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

      const currentIndex = selectedPlace
        ? places.findIndex((place) => place.id === selectedPlace.id)
        : -1
      const followingPlace =
        options?.advance && !isCreating && currentIndex >= 0
          ? places[currentIndex + 1]
          : undefined

      const nextPlaces = isCreating
        ? [...places, nextPlace]
        : places.map((place) =>
            place.id === selectedPlace?.id ? nextPlace : place
          )

      applyCatalog(tags, nextPlaces)
      setQuery("")

      if (followingPlace) {
        openPlaceForm(toDraft(followingPlace), false)
        onSelectPlace(followingPlace.id)
        return null
      }

      setPlacesScreen("list")
      isCreatingRef.current = false
      onDraftChange(null, false)
      onSelectPlace(nextPlace.id)

      return null
    },
    [
      applyCatalog,
      isCreating,
      onDraftChange,
      onSelectPlace,
      openPlaceForm,
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
        setPlacesScreen("list")
        isCreatingRef.current = false
        onDraftChange(null, false)
        onSelectPlace(null)
      }
    },
    [applyCatalog, onDraftChange, onSelectPlace, places, selectedPlaceId, tags]
  )

  const handleToggleDraftTag = useCallback(
    (tagId: string) => {
      if (placesScreen !== "form") {
        return
      }

      const currentDraft = getValues()
      setValue("tags", toggleDraftTag(currentDraft, tagId).tags)
    },
    [getValues, placesScreen, setValue]
  )

  const handleAddDraftTag = useCallback(() => {
    if (placesScreen !== "form") {
      return
    }

    const nextTags = addTagToCatalog(tags, draftNewTagLabel)

    if (!nextTags) {
      setError("Enter a unique tag label.")
      return
    }

    const addedTag = nextTags[nextTags.length - 1]
    const currentDraft = getValues()
    applyCatalog(nextTags, places)
    setValue(
      "tags",
      currentDraft.tags.includes(addedTag.id)
        ? currentDraft.tags
        : [...currentDraft.tags, addedTag.id]
    )
    setDraftNewTagLabel("")
  }, [
    applyCatalog,
    draftNewTagLabel,
    getValues,
    places,
    placesScreen,
    setValue,
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
      isImporting,
      isDirty,
      isSaving,
      error,
      activeTab,
      setActiveTab,
      placesScreen,
      hasNextPlace,
      goToPlacesList,
      handleCommit,
      clearImportPreview,
      updateImportSelection,
      handleAddTag,
      handleDeleteTag,
      handleMoveTag,
      handleSetTagIcon,
      handleSetTagColor,
      handleSetTagShowOnMap,
      handleImportPreview,
      handleImportConfirm,
      startCreate,
      startEdit,
      handleImageFiles,
      moveDraftImage,
      deleteDraftImage,
      handleApply,
      handleDelete,
      handleToggleDraftTag,
      handleAddDraftTag,
      pathDrawMode,
      isFetchingPath,
      pathDrawingError,
      setPathDrawMode,
      handlePathTypeChange,
      clearPath,
      undoPathPoint,
    }),
    [
      activeTab,
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
      handleSetTagColor,
      handleSetTagShowOnMap,
      handleImportConfirm,
      handleImportPreview,
      handleMoveTag,
      handleApply,
      handleCommit,
      handleToggleDraftTag,
      handlePathTypeChange,
      clearPath,
      undoPathPoint,
      hasNextPlace,
      isFetchingPath,
      pathDrawMode,
      pathDrawingError,
      setPathDrawMode,
      importListName,
      importPreview,
      importUrl,
      isCreating,
      isDirty,
      isImporting,
      isSaving,
      newTagLabel,
      places,
      placesScreen,
      query,
      selectedPlace,
      selectedPlaceId,
      startCreate,
      startEdit,
      handleImageFiles,
      moveDraftImage,
      deleteDraftImage,
      tags,
      updateImportSelection,
    ]
  )

  return (
    <FormProvider {...formMethods}>
      <PlaceEditorContext.Provider value={value}>
        {children}
      </PlaceEditorContext.Provider>
    </FormProvider>
  )
}
