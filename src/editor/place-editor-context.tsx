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
import { processImageFile } from "@/lib/image-metadata"
import { pathAnchoredAtPin, reversePath } from "@/lib/path"
import {
  addTagToCatalog,
  createEmptyDraft,
  fromDraft,
  moveTag,
  removeTagFromCatalog,
  removeTagFromPlaces,
  deletePlace,
  deleteTag,
  reorderTags,
  savePlace,
  saveTag,
  setTagColor,
  setTagIcon,
  setTagShowOnMap,
  toDraft,
  validatePathForDraft,
} from "@/lib/places"
import { loadPlaceImages } from "@/lib/content-repository"
import type { CatalogTag, DraftPlace, Place, PlaceImage } from "@/types/place"

import {
  toggleDraftTag,
  type EditorTab,
  type PlacesScreen,
} from "./place-editor-utils"

export type PlaceApplyError = {
  field?: keyof DraftPlace
  message: string
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
  newTagLabel: string
  setNewTagLabel: (label: string) => void
  draftNewTagLabel: string
  setDraftNewTagLabel: (label: string) => void
  isSaving: boolean
  error: string | null
  activeTab: EditorTab
  setActiveTab: (tab: EditorTab) => void
  placesScreen: PlacesScreen
  hasNextPlace: boolean
  goToPlacesList: () => void
  handleAddTag: () => Promise<void>
  handleDeleteTag: (tagId: string) => Promise<void>
  handleMoveTag: (index: number, direction: "up" | "down") => Promise<void>
  handleSetTagIcon: (tagId: string, icon: string | null) => Promise<void>
  handleSetTagColor: (tagId: string, color: string | null) => Promise<void>
  handleSetTagShowOnMap: (tagId: string, showOnMap: boolean) => Promise<void>
  startCreate: () => void
  startEdit: (place: Place) => void
  handleImageFiles: (files: FileList | File[]) => Promise<void>
  moveDraftImage: (index: number, direction: "up" | "down") => void
  deleteDraftImage: (index: number) => void
  handleApply: (
    values: DraftPlace,
    options?: { advance?: boolean }
  ) => Promise<PlaceApplyError | null>
  handleDelete: (placeId: string) => Promise<void>
  handleToggleDraftTag: (tagId: string) => void
  handleAddDraftTag: () => Promise<void>
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
    selectPlace: onSelectPlace,
    registerEditorPlaceSelect,
    registerEditorCoordinateHandler,
    registerEditorMarkerDragHandler,
  } = useAppState()

  const isCreatingRef = useRef(false)
  const imageLoadRequestRef = useRef(0)
  const formMethods = useForm<DraftPlace>({
    defaultValues: createEmptyDraft(),
    mode: "onSubmit",
  })
  const { reset, watch, setValue, getValues } = formMethods

  const [query, setQuery] = useState("")
  const [newTagLabel, setNewTagLabel] = useState("")
  const [draftNewTagLabel, setDraftNewTagLabel] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>("places")
  const [placesScreen, setPlacesScreen] = useState<PlacesScreen>("list")
  const [pathDrawMode, setPathDrawModeState] = useState<
    "roads" | "points" | null
  >(null)
  const [isFetchingPath, setIsFetchingPath] = useState(false)
  const [pathDrawingError, setPathDrawingError] = useState<string | null>(null)
  const pathDrawModeRef = useRef<"roads" | "points" | null>(null)

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
        const requestId = ++imageLoadRequestRef.current
        void loadPlaceImages(place.id)
          .then((images) => {
            if (requestId !== imageLoadRequestRef.current) {
              return
            }
            openPlaceForm(toDraft({ ...place, images }), false)
            onSelectPlace(place.id)
          })
          .catch((loadError) => {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Failed to load images"
            )
          })
      }
    })

    return () => registerEditorPlaceSelect(null)
  }, [onSelectPlace, openPlaceForm, places, registerEditorPlaceSelect])

  const applyCatalog = useCallback(
    (nextTags: CatalogTag[], nextPlaces: Place[]) => {
      setTags(nextTags)
      setPlaces(nextPlaces)
    },
    [setPlaces, setTags]
  )

  const handleAddTag = useCallback(async () => {
    const nextTags = addTagToCatalog(tags, newTagLabel)

    if (!nextTags) {
      setError("Enter a unique tag label.")
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await saveTag(nextTags[nextTags.length - 1], nextTags.length - 1)
      applyCatalog(nextTags, places)
      setNewTagLabel("")
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to add tag"
      )
    } finally {
      setIsSaving(false)
    }
  }, [applyCatalog, newTagLabel, places, tags])

  const handleDeleteTag = useCallback(
    async (tagId: string) => {
      setIsSaving(true)
      setError(null)
      try {
        await deleteTag(tagId)
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to delete tag"
        )
        setIsSaving(false)
        return
      }

      const nextTags = removeTagFromCatalog(tags, tagId)
      const nextPlaces = removeTagFromPlaces(places, tagId)
      applyCatalog(nextTags, nextPlaces)

      if (placesScreen === "form") {
        const currentDraft = getValues()
        setValue(
          "tags",
          currentDraft.tags.filter((draftTagId) => draftTagId !== tagId)
        )
      }
      setIsSaving(false)
    },
    [applyCatalog, getValues, places, placesScreen, setValue, tags]
  )

  const handleSetTagIcon = useCallback(
    async (tagId: string, icon: string | null) => {
      const nextTags = setTagIcon(tags, tagId, icon)
      const tagIndex = nextTags.findIndex((tag) => tag.id === tagId)
      setIsSaving(true)
      setError(null)
      try {
        await saveTag(nextTags[tagIndex], tagIndex)
        applyCatalog(nextTags, places)
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Failed to save tag"
        )
      } finally {
        setIsSaving(false)
      }
    },
    [applyCatalog, places, tags]
  )

  const handleSetTagColor = useCallback(
    async (tagId: string, color: string | null) => {
      const nextTags = setTagColor(tags, tagId, color)
      const tagIndex = nextTags.findIndex((tag) => tag.id === tagId)
      setIsSaving(true)
      setError(null)
      try {
        await saveTag(nextTags[tagIndex], tagIndex)
        applyCatalog(nextTags, places)
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Failed to save tag"
        )
      } finally {
        setIsSaving(false)
      }
    },
    [applyCatalog, places, tags]
  )

  const handleSetTagShowOnMap = useCallback(
    async (tagId: string, showOnMap: boolean) => {
      const nextTags = setTagShowOnMap(tags, tagId, showOnMap)
      const tagIndex = nextTags.findIndex((tag) => tag.id === tagId)
      setIsSaving(true)
      setError(null)
      try {
        await saveTag(nextTags[tagIndex], tagIndex)
        applyCatalog(nextTags, places)
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Failed to save tag"
        )
      } finally {
        setIsSaving(false)
      }
    },
    [applyCatalog, places, tags]
  )

  const handleMoveTag = useCallback(
    async (index: number, direction: "up" | "down") => {
      const targetIndex = direction === "up" ? index - 1 : index + 1
      const nextTags = moveTag(tags, index, targetIndex)
      setIsSaving(true)
      setError(null)
      try {
        await reorderTags(nextTags)
        applyCatalog(nextTags, places)
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to reorder tags"
        )
      } finally {
        setIsSaving(false)
      }
    },
    [applyCatalog, places, tags]
  )

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
      const requestId = ++imageLoadRequestRef.current
      try {
        const images = await loadPlaceImages(place.id)
        if (requestId !== imageLoadRequestRef.current) {
          return
        }
        openPlaceForm(toDraft({ ...place, images }), false)
        onSelectPlace(place.id)
      } catch (error) {
        if (requestId !== imageLoadRequestRef.current) {
          return
        }
        setError(
          error instanceof Error ? error.message : "Failed to load images"
        )
        return
      }
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
          nextImages.push(await processImageFile(file))
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
    async (
      values: DraftPlace,
      options?: { advance?: boolean }
    ): Promise<PlaceApplyError | null> => {
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

      setIsSaving(true)
      setError(null)
      try {
        await savePlace(
          nextPlace,
          isCreating
            ? places.reduce(
                (maxPosition, place) =>
                  Math.max(maxPosition, places.indexOf(place)),
                -1
              ) + 1
            : Math.max(currentIndex, 0)
        )
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save place"
        )
        setIsSaving(false)
        return { message: "Place could not be saved." }
      }
      setIsSaving(false)
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
    async (placeId: string) => {
      setIsSaving(true)
      setError(null)
      try {
        await deletePlace(placeId)
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete place"
        )
        setIsSaving(false)
        return
      }
      const nextPlaces = places.filter((place) => place.id !== placeId)
      applyCatalog(tags, nextPlaces)
      setIsSaving(false)

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

  const handleAddDraftTag = useCallback(async () => {
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
    setIsSaving(true)
    setError(null)
    try {
      await saveTag(addedTag, nextTags.length - 1)
      applyCatalog(nextTags, places)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to add tag"
      )
      setIsSaving(false)
      return
    }
    setValue(
      "tags",
      currentDraft.tags.includes(addedTag.id)
        ? currentDraft.tags
        : [...currentDraft.tags, addedTag.id]
    )
    setDraftNewTagLabel("")
    setIsSaving(false)
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
      newTagLabel,
      setNewTagLabel,
      draftNewTagLabel,
      setDraftNewTagLabel,
      isSaving,
      error,
      activeTab,
      setActiveTab,
      placesScreen,
      hasNextPlace,
      goToPlacesList,
      handleAddTag,
      handleDeleteTag,
      handleMoveTag,
      handleSetTagIcon,
      handleSetTagColor,
      handleSetTagShowOnMap,
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
      handleMoveTag,
      handleApply,
      handleToggleDraftTag,
      handlePathTypeChange,
      clearPath,
      undoPathPoint,
      hasNextPlace,
      isFetchingPath,
      pathDrawMode,
      pathDrawingError,
      setPathDrawMode,
      isCreating,
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
