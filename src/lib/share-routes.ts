export type ShareRoute =
  | { kind: "place"; id: string }
  | { kind: "tag"; id: string }
  | { kind: "home" }
  | { kind: "invalid" }

export function parseShareRoute(pathname: string): ShareRoute {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) return { kind: "home" }
  if (segments.length !== 2) return { kind: "invalid" }

  let id: string
  try {
    id = decodeURIComponent(segments[1])
  } catch {
    return { kind: "invalid" }
  }

  if (!id) return { kind: "invalid" }
  if (segments[0] === "places") return { kind: "place", id }
  if (segments[0] === "tags") return { kind: "tag", id }
  return { kind: "invalid" }
}

export function sharePathForState(
  selectedPlaceId: string | null,
  activeTag: string | null
) {
  if (selectedPlaceId) return `/places/${encodeURIComponent(selectedPlaceId)}`
  if (activeTag) return `/tags/${encodeURIComponent(activeTag)}`
  return "/"
}

export function shareUrl(path: string) {
  return new URL(path, window.location.origin).toString()
}
