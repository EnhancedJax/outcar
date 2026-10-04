import { useEffect } from "react"
import { Layer, Source, useMap } from "react-map-gl/mapbox"

import type { PathCoordinate } from "@/constants/path"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"

const LIGHT_CASING_COLOR = "#ffffff"
const LIGHT_LINE_COLOR = "#2563eb"
const DARK_CASING_COLOR = "#000"
const DARK_LINE_COLOR = "#2563eb"

type PlacePathLayerProps = {
  path: PathCoordinate[]
  pathType: number
  id: string
  animate?: boolean
}

export const PATH_DRAW_DELAY = 300
export const PATH_DRAW_DURATION = 900

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

export function PlacePathLayer({
  path,
  pathType,
  id,
  animate = false,
}: PlacePathLayerProps) {
  const resolvedTheme = useResolvedTheme()
  const isDark = resolvedTheme === "dark"
  const { current: map } = useMap()

  const sourceId = `place-path-${id}`
  const casingId = `${sourceId}-casing`
  const lineId = `${sourceId}-line`
  const casingColor = isDark ? DARK_CASING_COLOR : LIGHT_CASING_COLOR
  const lineColor = isDark ? DARK_LINE_COLOR : LIGHT_LINE_COLOR

  useEffect(() => {
    const mapbox = map?.getMap()

    if (!mapbox || !animate) {
      return
    }

    let frame: number | null = null
    const startedAt = performance.now() + PATH_DRAW_DELAY

    const setRevealProgress = (progress: number) => {
      const gradient = [
        "step",
        ["line-progress"],
        casingColor,
        progress,
        "rgba(0, 0, 0, 0)",
      ] as const
      const innerGradient = [
        "step",
        ["line-progress"],
        lineColor,
        progress,
        "rgba(0, 0, 0, 0)",
      ] as const

      for (const [layerId, colorGradient] of [
        [casingId, gradient],
        [lineId, innerGradient],
      ] as const) {
        if (mapbox.getLayer(layerId)) {
          mapbox.setPaintProperty(
            layerId,
            "line-gradient",
            colorGradient as any
          )
        }
      }
    }

    const animatePath = (time: number) => {
      const progress = Math.min(
        Math.max((time - startedAt) / PATH_DRAW_DURATION, 0),
        1
      )
      setRevealProgress(progress)

      if (progress < 1) {
        frame = requestAnimationFrame(animatePath)
      } else {
        for (const layerId of [casingId, lineId]) {
          if (mapbox.getLayer(layerId)) {
            mapbox.setPaintProperty(layerId, "line-gradient", undefined)
          }
        }
      }
    }

    frame = requestAnimationFrame(animatePath)

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
    }
  }, [animate, casingColor, casingId, lineColor, lineId, map])

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
    <Source id={sourceId} type="geojson" data={pathFeature(path)} lineMetrics>
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
