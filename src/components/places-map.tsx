import { useEffect, useMemo, useRef } from "react"
import Map, { Marker, Popup, type MapRef } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"

import { getMapStyle, getMapboxToken } from "@/lib/mapbox"
import type { Place } from "@/types/place"

type PlacesMapProps = {
  places: Place[]
  isDark: boolean
  selectedPlaceId?: string | null
  onSelectPlace?: (placeId: string) => void
  onMapClick?: (longitude: number, latitude: number) => void
  onMarkerDrag?: (placeId: string, longitude: number, latitude: number) => void
  draggableMarkerId?: string | null
}

const DEFAULT_VIEW = {
  longitude: 139.7,
  latitude: 35.68,
  zoom: 10,
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
  isDark,
  selectedPlaceId = null,
  onSelectPlace,
  onMapClick,
  onMarkerDrag,
  draggableMarkerId = null,
}: PlacesMapProps) {
  const mapRef = useRef<MapRef>(null)
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
    }
  }, [places])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    const bounds = getBounds(places)

    if (!map || !bounds) {
      return
    }

    map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 14,
      duration: 600,
    })
  }, [places])

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={getMapboxToken()}
      mapStyle={getMapStyle(isDark)}
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
  )
}
