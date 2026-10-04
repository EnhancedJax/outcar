import "mapbox-gl/dist/mapbox-gl.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Map, { Marker, type MapRef } from "react-map-gl/mapbox"

import { useAppState } from "@/app-state"
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
import {
  getBasemapConfig,
  getMapStyle,
  getMapboxToken,
  type MapAppearance,
} from "@/lib/mapbox"
import { pathBounds } from "@/lib/path"
import { resolvePlaceMapTagIcon } from "@/lib/places"
import type { Place } from "@/types/place"
import MapAppearanceControl from "./map-appearance-control"

const DEFAULT_PITCH = 50
const ORBIT_SPEED = 5
const FOCUS_ZOOM = 15
const SELECTED_PLACE_BOTTOM_PADDING = 220

const DEFAULT_VIEW = {
  longitude: 139.7,
  latitude: 35.68,
  zoom: 10,
  pitch: DEFAULT_PITCH,
}

function getBounds(places: Place[]) {
  if (places.length === 0) {
    return null
  }

  let minLng = places[0].longitude
  let maxLng = places[0].longitude
  let minLat = places[0].latitude
  let maxLat = places[0].latitude

  for (const place of places) {
    minLng = Math.min(minLng, place.longitude)
    maxLng = Math.max(maxLng, place.longitude)
    minLat = Math.min(minLat, place.latitude)
    maxLat = Math.max(maxLat, place.latitude)
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ] as [[number, number], [number, number]]
}

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
  const orbitFrameRef = useRef<number | null>(null)
  const isOrbitingRef = useRef(false)
  const awaitingFocusMoveEndRef = useRef(false)
  const hasFitEditorBoundsRef = useRef(false)
  const [mapAppearance, setMapAppearance] =
    useState<MapAppearance>("monochrome")
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const stopOrbit = useCallback(() => {
    isOrbitingRef.current = false

    if (orbitFrameRef.current !== null) {
      cancelAnimationFrame(orbitFrameRef.current)
      orbitFrameRef.current = null
    }
  }, [])

  const startOrbit = useCallback(
    (place: Place, orbitCenter?: [number, number]) => {
      const map = mapRef.current?.getMap()

      if (!map) {
        return
      }

      stopOrbit()
      isOrbitingRef.current = true

      const center: [number, number] = orbitCenter ?? [
        place.longitude,
        place.latitude,
      ]
      let bearing = map.getBearing()
      let lastTime = performance.now()
      const zoom = Math.max(map.getZoom(), FOCUS_ZOOM)

      const tick = (time: number) => {
        if (!isOrbitingRef.current) {
          return
        }

        const delta = (time - lastTime) / 1000
        lastTime = time
        bearing = (bearing + ORBIT_SPEED * delta) % 360

        map.jumpTo({
          center,
          bearing,
          pitch: DEFAULT_PITCH,
          zoom,
        })

        orbitFrameRef.current = requestAnimationFrame(tick)
      }

      orbitFrameRef.current = requestAnimationFrame(tick)
    },
    [stopOrbit]
  )

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
      return DEFAULT_VIEW
    }

    const longitude =
      places.reduce((sum, place) => sum + place.longitude, 0) / places.length
    const latitude =
      places.reduce((sum, place) => sum + place.latitude, 0) / places.length

    return {
      longitude,
      latitude,
      zoom: 11,
      pitch: DEFAULT_PITCH,
    }
  }, [places])

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
      pitch: DEFAULT_PITCH,
      duration: 600,
    })
  }, [boundsPlaces, viewerMode])

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
      stopOrbit()
      return
    }

    const map = mapRef.current?.getMap()

    if (!map) {
      return
    }

    awaitingFocusMoveEndRef.current = true

    const hasPath =
      selectedPlace.pathType !== -1 && selectedPlace.path.length >= 2
    let orbitCenter: [number, number] | undefined

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
          bottom: SELECTED_PLACE_BOTTOM_PADDING,
          left: 80,
        },
      })

      orbitCenter = [
        (bounds[0][0] + bounds[1][0]) / 2,
        (bounds[0][1] + bounds[1][1]) / 2,
      ]

      if (camera) {
        map.flyTo({
          center: camera.center,
          zoom: camera.zoom,
          bearing: camera.bearing,
          pitch: DEFAULT_PITCH,
          duration: 1200,
          essential: true,
        })
      }
    } else {
      map.flyTo({
        center: [selectedPlace.longitude, selectedPlace.latitude],
        zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
        pitch: DEFAULT_PITCH,
        duration: 1200,
        essential: true,
      })
    }

    const handleMoveEnd = () => {
      if (!awaitingFocusMoveEndRef.current) {
        return
      }

      awaitingFocusMoveEndRef.current = false
      startOrbit(selectedPlace, orbitCenter)
    }

    map.once("moveend", handleMoveEnd)

    return () => {
      awaitingFocusMoveEndRef.current = false
      map.off("moveend", handleMoveEnd)
      stopOrbit()
    }
  }, [viewerMode, selectedPlace, startOrbit, stopOrbit])

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
      stopOrbit()
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
  }, [viewerMode, stopOrbit])

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
          />
        ) : null}

        {visiblePlaces.map((place) => {
          const isSelected = place.id === selectedPlaceId
          const isDraggable = place.id === draggableMarkerId
          const mapTagIcon = resolvePlaceMapTagIcon(place.tags, tags)

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
                <SelectedPlacePin tagIcon={mapTagIcon} />
              ) : (
                <PlacePin tagIcon={mapTagIcon} />
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
      />
      <SelectedPlace />
      <TagList />
    </div>
  )
}
