import { useEffect, useMemo, useRef, useState } from "react"
import Map, { Marker, Popup, type MapRef } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

import { Button } from "@/components/ui/button"
import {
  getBasemapConfig,
  getMapStyle,
  getMapboxToken,
  type MapAppearance,
} from "@/lib/mapbox"
import type { Place } from "@/types/place"

type PlacesMapProps = {
  places: Place[]
  fitBoundsPlaces?: Place[]
  previewPlaces?: Place[]
  tags?: string[]
  activeTag?: string | null
  onActiveTagChange?: (tag: string | null) => void
  isDark: boolean
  selectedPlaceId?: string | null
  onSelectPlace?: (placeId: string) => void
  onMapClick?: (longitude: number, latitude: number) => void
  onMarkerDrag?: (placeId: string, longitude: number, latitude: number) => void
  draggableMarkerId?: string | null
}

const DEFAULT_PITCH = 50

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

export function PlacesMap({
  places,
  fitBoundsPlaces,
  previewPlaces = [],
  tags = [],
  activeTag = null,
  onActiveTagChange,
  isDark,
  selectedPlaceId = null,
  onSelectPlace,
  onMapClick,
  onMarkerDrag,
  draggableMarkerId = null,
}: PlacesMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [mapAppearance, setMapAppearance] = useState<MapAppearance>("monochrome")
  const showTagFilter = !import.meta.env.DEV && tags.length > 0

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

  function handleTagClick(tag: string) {
    if (!onActiveTagChange) {
      return
    }

    onActiveTagChange(activeTag === tag ? null : tag)
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={getMapboxToken()}
        mapStyle={getMapStyle()}
        config={{ basemap: basemapConfig }}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        onClick={(event) => {
          onMapClick?.(event.lngLat.lng, event.lngLat.lat)
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
                onSelectPlace?.(place.id)
              }}
              onDragEnd={(event) => {
                onMarkerDrag?.(place.id, event.lngLat.lng, event.lngLat.lat)
              }}
            >
              <div
                className={`size-4 rounded-full border-2 border-white shadow-md transition-transform ${
                  isSelected ? "scale-125 bg-primary" : "bg-destructive"
                }`}
              />
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
            <div className="size-4 rounded-full border-2 border-primary bg-background shadow-md" />
          </Marker>
        ))}

        {selectedPlace && !draggableMarkerId ? (
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

      {showTagFilter ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
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
        </div>
      ) : null}
    </div>
  )
}
