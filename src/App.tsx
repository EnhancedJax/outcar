import { Sidebar } from "@phosphor-icons/react"
import { lazy, Suspense } from "react"

import { useAppState } from "@/app-state"
import { PlacesMap } from "@/components/places-map"
import { Button } from "@/components/ui/button"

const PlaceEditor = import.meta.env.DEV
  ? lazy(() => import("@/editor/place-editor"))
  : null

export function App() {
  const { isEditorOpen, setIsEditorOpen } = useAppState()

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <main className="relative min-h-0 min-w-0 flex-1">
        <PlacesMap />

        {PlaceEditor ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-4 right-4 z-20 shadow-lg"
            aria-expanded={isEditorOpen}
            aria-label={isEditorOpen ? "Close editor" : "Open editor"}
            onClick={() => setIsEditorOpen((open) => !open)}
          >
            <Sidebar />
          </Button>
        ) : null}
      </main>

      {PlaceEditor && isEditorOpen ? (
        <div className="flex h-full w-sm shrink-0 flex-col overflow-hidden border-l border-border">
          <Suspense fallback={null}>
            <PlaceEditor />
          </Suspense>
        </div>
      ) : null}
    </div>
  )
}

export default App
