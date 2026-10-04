import type { IconProps } from "@phosphor-icons/react"
import { CarIcon, PersonSimpleWalkIcon, ProhibitIcon } from "@phosphor-icons/react"
import type { ComponentType } from "react"

export type PathTypeValue = -1 | 0 | 1

export type PathTypeDefinition = {
  value: PathTypeValue
  title: string
  icon: ComponentType<IconProps>
  description: string
}

export const PATH_TYPES: readonly PathTypeDefinition[] = [
  {
    value: -1,
    title: "None",
    icon: ProhibitIcon,
    description: "No path to this place",
  },
  {
    value: 0,
    title: "Driving",
    icon: CarIcon,
    description: "Solid line ending at the pin",
  },
  {
    value: 1,
    title: "Walk",
    icon: PersonSimpleWalkIcon,
    description: "Dotted line starting at the pin",
  },
]

const pathTypeMap = new Map(PATH_TYPES.map((pathType) => [pathType.value, pathType]))

export function isPathTypeValue(value: unknown): value is PathTypeValue {
  return typeof value === "number" && pathTypeMap.has(value as PathTypeValue)
}

export function pathTypeByValue(value: number): PathTypeDefinition | undefined {
  return pathTypeMap.get(value as PathTypeValue)
}

export type PathCoordinate = [longitude: number, latitude: number]
