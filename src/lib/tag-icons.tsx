import * as PhosphorIcons from "@phosphor-icons/react"
import type { IconProps } from "@phosphor-icons/react"
import { createElement, type ComponentType } from "react"

const SKIP_ICON_NAMES = new Set(["IconContext", "IconBase", "SSR", "default"])

function isIconComponent(value: unknown): value is ComponentType<IconProps> {
  return typeof value === "function" || typeof value === "object"
}

function buildIconRegistry() {
  const entries = Object.entries(PhosphorIcons).filter(([name, component]) => {
    if (SKIP_ICON_NAMES.has(name)) {
      return false
    }

    if (!/^[A-Z]/.test(name)) {
      return false
    }

    return isIconComponent(component)
  })

  const names = entries
    .map(([name]) => name)
    .filter((name) => {
      if (!name.endsWith("Icon")) {
        return !entries.some(([candidate]) => candidate === `${name}Icon`)
      }

      return true
    })
    .sort((left, right) => left.localeCompare(right))

  const components = new Map<string, ComponentType<IconProps>>()

  for (const name of names) {
    const component = PhosphorIcons[name as keyof typeof PhosphorIcons]

    if (isIconComponent(component)) {
      components.set(name, component)
    }
  }

  return { names, components }
}

const iconRegistry = buildIconRegistry()

export const phosphorIconNames = iconRegistry.names

export function isValidPhosphorIconName(name: string | null | undefined): boolean {
  if (!name) {
    return false
  }

  return iconRegistry.components.has(name)
}

export function normalizePhosphorIconName(
  name: string | null | undefined
): string | null {
  if (!name) {
    return null
  }

  const trimmed = name.trim()

  if (!trimmed || !isValidPhosphorIconName(trimmed)) {
    return null
  }

  return trimmed
}

type TagIconProps = IconProps & {
  name: string | null | undefined
}

export function TagIcon({ name, ...props }: TagIconProps) {
  if (!name) {
    return null
  }

  const IconComponent = iconRegistry.components.get(name)

  if (!IconComponent) {
    return null
  }

  return createElement(IconComponent, props)
}

export function searchPhosphorIconNames(
  query: string,
  limit = 48
): string[] {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return phosphorIconNames.slice(0, limit)
  }

  const matches: string[] = []

  for (const name of phosphorIconNames) {
    if (name.toLowerCase().includes(normalized)) {
      matches.push(name)

      if (matches.length >= limit) {
        break
      }
    }
  }

  return matches
}
