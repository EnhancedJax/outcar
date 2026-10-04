import type { PathCoordinate } from "@/constants/path"
import { Layer, Source } from "react-map-gl/mapbox"

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
  if (pathType === -1 || path.length < 2) {
    return null
  }

  const sourceId = `place-path-${id}`
  const isWalk = pathType === 1

  return (
    <Source
      id={sourceId}
      type="geojson"
      data={pathFeature(path)}
    >
      <Layer
        id={`${sourceId}-casing`}
        type="line"
        paint={{
          "line-color": "#ffffff",
          "line-width": 6,
          "line-opacity": 0.85,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
      <Layer
        id={`${sourceId}-line`}
        type="line"
        paint={{
          "line-color": "#2563eb",
          "line-width": 3,
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
