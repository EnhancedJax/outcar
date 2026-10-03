import { X } from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Map, { Marker, Popup, type MapRef } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

import { useAppState } from "@/app-state"
import {
  PlacePin,
  PreviewPlacePin,
  SelectedPlacePin,
} from "@/components/place-pin"
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
    tags,
    activeTag,
    setActiveTag,
    viewerMode,
    selectedPlaceId,
    selectPlace,
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
  const [mapAppearance, setMapAppearance] = useState<MapAppearance>("monochrome")

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

  const showTagFilter = viewerMode && tags.length > 0
  const showPlaceDetails = viewerMode && selectedPlace

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

  function handleTagClick(tag: string) {
    setActiveTag(activeTag === tag ? null : tag)
  }

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
                selectPlace(place.id)
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

        {selectedPlace && !viewerMode && !draggableMarkerId ? (
          <Popup
            longitude={selectedPlace.longitude}
            latitude={selectedPlace.latitude}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            offset={12}
          >
            <div className="max-w-56 space-y-1">
              <p className="font-medium">{selectedPlace.name}</p>
              {selectedPlace.note ? (
                <p className="text-sm text-muted-foreground">{selectedPlace.note}</p>
              ) : null}
            </div>
          </Popup>
        ) : null}
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

      {showPlaceDetails || showTagFilter ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 p-4">
          {showPlaceDetails ? (
            <div
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur"
              role="dialog"
              aria-label={selectedPlace.name}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <h2 className="text-lg font-medium">{selectedPlace.name}</h2>
                  {selectedPlace.note ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedPlace.note}
                    </p>
                  ) : null}
                  {selectedPlace.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPlace.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Dismiss place details"
                  onClick={() => {
                    stopOrbit()
                    selectPlace(null)
                  }}
                >
                  <X />
                </Button>
              </div>
            </div>
          ) : null}

          {showTagFilter ? (
            <div
              className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur"
              role="toolbar"
              aria-label="Filter places by tag"
            >
              {tags.map((tag) => {
                const isActive = activeTag === tag

                return (
                  <button
                    key={tag}
                    type="button"
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                    aria-pressed={isActive}
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
