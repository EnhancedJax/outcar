import { Sidebar } from "@phosphor-icons/react"
import { lazy, Suspense } from "react"

import { useAppState } from "@/app-state"
import { useAuth } from "@/auth"
import { PasswordDialog } from "@/components/password-dialog"
import { PlacesMap } from "@/components/places-map"
import { Button } from "@/components/ui/button"
import AppError from "./components/app-error"
import AppLoading from "./components/app-loading"

const PlaceEditor = lazy(() => import("@/editor/place-editor"))

export function App() {
  const { isEditorOpen, setIsEditorOpen, isCatalogLoading, catalogError } =
    useAppState()
  const { isAuthenticated, signOut } = useAuth() // ignore isLoading for auth

  return (
    <>
      <AppLoading isLoading={isCatalogLoading} />
      {isCatalogLoading ? null : catalogError ? (
        <AppError error={new Error(catalogError)} />
      ) : (
        <div className="flex h-dvh w-full overflow-hidden">
          <main className="relative min-h-0 min-w-0 flex-1">
            <PlacesMap />

            {isAuthenticated ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-4 right-16 z-20 shadow-lg"
                aria-expanded={isEditorOpen}
                aria-label={isEditorOpen ? "Close editor" : "Open editor"}
                onClick={() => setIsEditorOpen((open) => !open)}
              >
                <Sidebar />
              </Button>
            ) : null}
          </main>

          {isAuthenticated && isEditorOpen ? (
            <div className="fixed inset-x-0 bottom-0 z-40 flex h-[50svh] w-full shrink-0 flex-col overflow-hidden border-t border-border bg-background md:static md:h-full md:w-sm md:border-t-0 md:border-l">
              <Suspense fallback={null}>
                <PlaceEditor />
              </Suspense>
            </div>
          ) : null}
          {isAuthenticated ? (
            <Button
              type="button"
              variant="destructive"
              className="fixed right-4 bottom-4 z-30"
              onClick={() => void signOut()}
            >
              Lock editor
            </Button>
          ) : null}
          <PasswordDialog />
        </div>
      )}
    </>
  )
}

export default App
