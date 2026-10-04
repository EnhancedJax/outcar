import { useEffect } from "react"
import { Layer, Source, useMap } from "react-map-gl/mapbox"

import type { PathCoordinate } from "@/constants/path"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"

const LIGHT_CASING_COLOR = "#ffffff"
const LIGHT_LINE_COLOR = "#2563eb"
const DARK_CASING_COLOR = "#000000"
const DARK_LINE_COLOR = "#9db4e5"

type PlacePathLayerProps = {
  path: PathCoordinate[]
  pathType: number
  id: string
}

function pathFeature(path: PathCoordinate[]) {
  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: path,
    },
    properties: {},
  }
}

export function PlacePathLayer({ path, pathType, id }: PlacePathLayerProps) {
  const resolvedTheme = useResolvedTheme()
  const isDark = resolvedTheme === "dark"
  const { current: map } = useMap()

  const sourceId = `place-path-${id}`
  const casingId = `${sourceId}-casing`
  const lineId = `${sourceId}-line`
  const casingColor = isDark ? DARK_CASING_COLOR : LIGHT_CASING_COLOR
  const lineColor = isDark ? LIGHT_LINE_COLOR : DARK_LINE_COLOR

  useEffect(() => {
    const mapbox = map?.getMap()

    if (!mapbox) {
      return
    }

    const applyLinePaint = (layerId: string, color: string) => {
      if (!mapbox.getLayer(layerId)) {
        return
      }

      if (mapbox.getPaintProperty(layerId, "line-color") !== color) {
        mapbox.setPaintProperty(layerId, "line-color", color)
      }

      // Standard style lights shade layer colors. Night preset turns a
      // full red into something like #1B0301 unless the line is emissive.
      if (mapbox.getPaintProperty(layerId, "line-emissive-strength") !== 1) {
        mapbox.setPaintProperty(layerId, "line-emissive-strength", 1)
      }
    }

    const applyColors = () => {
      applyLinePaint(casingId, casingColor)
      applyLinePaint(lineId, lineColor)
    }

    applyColors()
    mapbox.on("styledata", applyColors)

    return () => {
      mapbox.off("styledata", applyColors)
    }
  }, [map, casingId, lineId, casingColor, lineColor])

  if (pathType === -1 || path.length < 2) {
    return null
  }

  const isWalk = pathType === 1

  return (
    <Source id={sourceId} type="geojson" data={pathFeature(path)}>
      <Layer
        id={casingId}
        type="line"
        paint={{
          "line-color": casingColor,
          "line-emissive-strength": 1,
          "line-width": 12,
          "line-opacity": 0.85,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
      <Layer
        id={lineId}
        type="line"
        paint={{
          "line-color": lineColor,
          "line-emissive-strength": 1,
          "line-width": 6,
          "line-opacity": 0.95,
          ...(isWalk ? { "line-dasharray": [1.5, 1.5] } : {}),
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
    </Source>
  )
}
