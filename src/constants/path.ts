export type PathTypeValue = -1 | 0 | 1

export type PathTypeDefinition = {
  value: PathTypeValue
  title: string
  description: string
}

export const PATH_TYPES: readonly PathTypeDefinition[] = [
  {
    value: -1,
    title: "None",
    description: "No path to this place",
  },
  {
    value: 0,
    title: "Driving",
    description: "Solid line ending at the pin",
  },
  {
    value: 1,
    title: "Walk",
    description: "Dotted line starting at the pin",
  },
]

const pathTypeMap = new Map(
  PATH_TYPES.map((pathType) => [pathType.value, pathType])
)

export function isPathTypeValue(value: unknown): value is PathTypeValue {
  return typeof value === "number" && pathTypeMap.has(value as PathTypeValue)
}

export function pathTypeByValue(value: number): PathTypeDefinition | undefined {
  return pathTypeMap.get(value as PathTypeValue)
}

export type PathCoordinate = [longitude: number, latitude: number]
