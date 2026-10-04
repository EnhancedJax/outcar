import "mapbox-gl/dist/mapbox-gl.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Map, { Marker, type MapRef } from "react-map-gl/mapbox"

import { useAppState } from "@/app-state"
import {
  PlacePin,
  PreviewPlacePin,
  SelectedPlacePin,
} from "@/components/place-pin"
import { SelectedPlace } from "@/components/selected-place"
import { TagList } from "@/components/tag-list"
import { Button } from "@/components/ui/button"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"
import {
  getBasemapConfig,
  getMapStyle,
  getMapboxToken,
  type MapAppearance,
} from "@/lib/mapbox"
import type { Place } from "@/types/place"

const DEFAULT_PITCH = 50
const ORBIT_SPEED = 5
const FOCUS_ZOOM = 15

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
    viewerMode,
    selectedPlaceId,
    selectPlaceFromMap,
    handleMapClick,
    handleMarkerDrag,
    draggableMarkerId,
  } = useAppState()
  const resolvedTheme = useResolvedTheme()
  const isDark = resolvedTheme === "dark"
  const previewPlaces = importPreviewPlaces ?? []

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)
  const orbitFrameRef = useRef<number | null>(null)
  const isOrbitingRef = useRef(false)
  const awaitingFocusMoveEndRef = useRef(false)
  const [mapAppearance, setMapAppearance] =
    useState<MapAppearance>("monochrome")

  const stopOrbit = useCallback(() => {
    isOrbitingRef.current = false

    if (orbitFrameRef.current !== null) {
      cancelAnimationFrame(orbitFrameRef.current)
      orbitFrameRef.current = null
    }
  }, [])

  const startOrbit = useCallback(
    (place: Place) => {
      const map = mapRef.current?.getMap()

      if (!map) {
        return
      }

      stopOrbit()
      isOrbitingRef.current = true

      const center: [number, number] = [place.longitude, place.latitude]
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
    const map = mapRef.current?.getMap()
    const bounds = getBounds(boundsPlaces)

    if (!map || !bounds) {
      return
    }

    map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 16,
      pitch: DEFAULT_PITCH,
      duration: 600,
    })
  }, [boundsPlaces])

  useEffect(() => {
    const map = mapRef.current?.getMap()

    if (!map) {
      return
    }

    const applyConfig = () => {
      map.setConfig("basemap", basemapConfig)
    }

    if (map.isStyleLoaded()) {
      applyConfig()
    } else {
      map.once("style.load", applyConfig)
    }
  }, [basemapConfig])

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

    map.flyTo({
      center: [selectedPlace.longitude, selectedPlace.latitude],
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      pitch: DEFAULT_PITCH,
      duration: 1200,
      essential: true,
    })

    const handleMoveEnd = () => {
      if (!awaitingFocusMoveEndRef.current) {
        return
      }

      awaitingFocusMoveEndRef.current = false
      startOrbit(selectedPlace)
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
        style={{ width: "100%", height: "100%" }}
        onClick={(event) => {
          handleMapClick(event.lngLat.lng, event.lngLat.lat)
        }}
      >
        {places.map((place) => {
          const isSelected = place.id === selectedPlaceId
          const isDraggable = place.id === draggableMarkerId

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
              {isSelected ? <SelectedPlacePin /> : <PlacePin />}
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

      <div className="absolute top-4 left-4 z-10 flex gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
        <Button
          type="button"
          variant={mapAppearance === "monochrome" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMapAppearance("monochrome")}
        >
          B&W
        </Button>
        <Button
          type="button"
          variant={mapAppearance === "colored" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMapAppearance("colored")}
        >
          Color
        </Button>
      </div>

      <SelectedPlace />
      <TagList />
    </div>
  )
}
