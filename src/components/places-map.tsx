import "mapbox-gl/dist/mapbox-gl.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Map, { Marker, type MapRef } from "react-map-gl/mapbox"

import { useAppState } from "@/app-state"
import MapAppearanceControl from "@/components/map-appearance-control"
import { MapHeader } from "@/components/map-header"
import { PlacePathLayer } from "@/components/place-path-layer"
import {
  PlacePin,
  PreviewPlacePin,
  SelectedPlacePin,
} from "@/components/place-pin"
import { SelectedPlace } from "@/components/selected-place"
import { TagList } from "@/components/tag-list"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"
import { getBounds } from "@/lib/geo"
import {
  getBasemapConfig,
  getMapStyle,
  getMapboxToken,
  type MapAppearance,
} from "@/lib/mapbox"
import { pathBounds } from "@/lib/path"
import { resolvePlaceMapTag } from "@/lib/places"
import { DEFAULT_VIEW, readMapSettings, saveMapSettings } from "@/lib/settings"

const FOCUS_DURATION = 1200
const FOCUS_ZOOM = 15

export function PlacesMap() {
  const {
    displayPlaces: places,
    fitBoundsPlaces,
    importPreviewPlaces,
    tags,
    viewerMode,
    selectedPlaceId,
    selectPlaceFromMap,
    handleMapClick,
    handleMarkerDrag,
    draggableMarkerId,
  } = useAppState()
  const resolvedTheme = useResolvedTheme()
  const isDark = resolvedTheme === "dark"
  const previewPlaces = useMemo(
    () => importPreviewPlaces ?? [],
    [importPreviewPlaces]
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const awaitingFocusMoveEndRef = useRef(false)
  const hasFitEditorBoundsRef = useRef(false)
  const [mapAppearance, setMapAppearance] = useState<MapAppearance>(
    () => readMapSettings().appearance
  )
  const [pitch, setPitch] = useState(() => readMapSettings().pitch)
  const pitchRef = useRef(pitch)
  const [initialPitch] = useState(pitch)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const handlePitchChange = useCallback((nextPitch: number) => {
    pitchRef.current = nextPitch
    setPitch(nextPitch)

    mapRef.current?.getMap()?.setPitch(nextPitch)
  }, [])

  useEffect(() => {
    saveMapSettings({ appearance: mapAppearance, pitch })
  }, [mapAppearance, pitch])

  const basemapConfig = useMemo(
    () => getBasemapConfig(mapAppearance, isDark),
    [mapAppearance, isDark]
  )

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  )

  const visiblePlaces = useMemo(() => {
    if (viewerMode && selectedPlaceId) {
      return places.filter((place) => place.id === selectedPlaceId)
    }

    return places
  }, [places, selectedPlaceId, viewerMode])

  const pathPlace = useMemo(() => {
    if (viewerMode) {
      return selectedPlace
    }

    if (draggableMarkerId) {
      return places.find((place) => place.id === draggableMarkerId) ?? null
    }

    return selectedPlace
  }, [draggableMarkerId, places, selectedPlace, viewerMode])

  const initialViewState = useMemo(() => {
    if (places.length === 0) {
      return {
        ...DEFAULT_VIEW,
        pitch: initialPitch,
      }
    }

    const longitude =
      places.reduce((sum, place) => sum + place.longitude, 0) / places.length
    const latitude =
      places.reduce((sum, place) => sum + place.latitude, 0) / places.length

    return {
      longitude,
      latitude,
      zoom: 11,
      pitch: initialPitch,
    }
  }, [initialPitch, places])

  const boundsPlaces = useMemo(
    () => [...(fitBoundsPlaces ?? places), ...previewPlaces],
    [fitBoundsPlaces, places, previewPlaces]
  )

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize()
    })

    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (!isMapLoaded) {
      return
    }

    const isEditorMode = !viewerMode

    if (isEditorMode && hasFitEditorBoundsRef.current) {
      return
    }

    const map = mapRef.current?.getMap()
    const bounds = getBounds(boundsPlaces)

    if (!map || !bounds) {
      return
    }

    if (isEditorMode) {
      hasFitEditorBoundsRef.current = true
    }

    map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 16,
      pitch: pitchRef.current,
      duration: 600,
    })
  }, [boundsPlaces, isMapLoaded, viewerMode])

  useEffect(() => {
    if (!isMapLoaded) {
      return
    }

    const map = mapRef.current?.getMap()

    if (!map) {
      return
    }

    const applyConfig = () => {
      map.setConfig("basemap", basemapConfig)
    }

    if (map.isStyleLoaded()) {
      applyConfig()
      return
    }

    map.once("style.load", applyConfig)

    return () => {
      map.off("style.load", applyConfig)
    }
  }, [basemapConfig, isMapLoaded])

  useEffect(() => {
    if (!viewerMode || !selectedPlace) {
      awaitingFocusMoveEndRef.current = false
      return
    }

    const map = mapRef.current?.getMap()

    if (!map) {
      return
    }

    awaitingFocusMoveEndRef.current = true

    const hasPath =
      selectedPlace.pathType !== -1 && selectedPlace.path.length >= 2

    if (hasPath) {
      const bounds = pathBounds(
        selectedPlace.longitude,
        selectedPlace.latitude,
        selectedPlace.path
      )
      const camera = map.cameraForBounds(bounds, {
        padding: {
          top: 80,
          right: 80,
          bottom: 220, // selected place bottom padding
          left: 80,
        },
      })

      if (camera) {
        map.flyTo({
          center: camera.center,
          zoom: camera.zoom,
          bearing: camera.bearing,
          pitch: pitchRef.current,
          duration: FOCUS_DURATION,
          essential: true,
        })
      }
    } else {
      map.flyTo({
        center: [selectedPlace.longitude, selectedPlace.latitude],
        zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
        pitch: pitchRef.current,
        duration: FOCUS_DURATION,
        essential: true,
      })
    }

    const handleMoveEnd = () => {
      if (!awaitingFocusMoveEndRef.current) {
        return
      }

      awaitingFocusMoveEndRef.current = false
    }

    map.once("moveend", handleMoveEnd)

    return () => {
      awaitingFocusMoveEndRef.current = false
      map.off("moveend", handleMoveEnd)
    }
  }, [viewerMode, selectedPlace])

  useEffect(() => {
    if (!viewerMode) {
      return
    }

    const map = mapRef.current?.getMap()

    if (!map) {
      return
    }

    const handleCameraInteraction = () => {
      awaitingFocusMoveEndRef.current = false
    }

    map.on("dragstart", handleCameraInteraction)
    map.on("wheel", handleCameraInteraction)
    map.on("rotatestart", handleCameraInteraction)
    map.on("pitchstart", handleCameraInteraction)
    map.on("touchstart", handleCameraInteraction)

    return () => {
      map.off("dragstart", handleCameraInteraction)
      map.off("wheel", handleCameraInteraction)
      map.off("rotatestart", handleCameraInteraction)
      map.off("pitchstart", handleCameraInteraction)
      map.off("touchstart", handleCameraInteraction)
    }
  }, [viewerMode])

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={getMapboxToken()}
        mapStyle={getMapStyle()}
        config={{ basemap: basemapConfig }}
        initialViewState={initialViewState}
        onLoad={() => {
          setIsMapLoaded(true)
        }}
        style={{ width: "100%", height: "100%" }}
        onClick={(event) => {
          handleMapClick(event.lngLat.lng, event.lngLat.lat)
        }}
      >
        {pathPlace ? (
          <PlacePathLayer
            id={pathPlace.id}
            path={pathPlace.path}
            pathType={pathPlace.pathType}
            animate={viewerMode}
          />
        ) : null}

        {visiblePlaces.map((place) => {
          const isSelected = place.id === selectedPlaceId
          const isDraggable = place.id === draggableMarkerId
          const mapTag = resolvePlaceMapTag(place.tags, tags)

          return (
            <Marker
              key={place.id}
              longitude={place.longitude}
              latitude={place.latitude}
              anchor="bottom"
              draggable={isDraggable}
              onClick={(event) => {
                event.originalEvent.stopPropagation()
                selectPlaceFromMap(place.id)
              }}
              onDragEnd={(event) => {
                handleMarkerDrag(place.id, event.lngLat.lng, event.lngLat.lat)
              }}
            >
              {isSelected ? (
                <SelectedPlacePin
                  tagIcon={mapTag?.icon}
                  tagColor={mapTag?.color}
                />
              ) : (
                <PlacePin tagIcon={mapTag?.icon} tagColor={mapTag?.color} />
              )}
            </Marker>
          )
        })}

        {previewPlaces.map((place) => (
          <Marker
            key={place.id}
            longitude={place.longitude}
            latitude={place.latitude}
            anchor="bottom"
          >
            <PreviewPlacePin />
          </Marker>
        ))}
      </Map>

      <MapHeader />

      <MapAppearanceControl
        mapAppearance={mapAppearance}
        setMapAppearance={setMapAppearance}
        pitch={pitch}
        onPitchChange={handlePitchChange}
      />
      <SelectedPlace />
      <TagList />
    </div>
  )
}
