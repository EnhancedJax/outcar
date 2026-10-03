import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

import { usePlaceEditor } from "../place-editor-context"
import { PlaceForm } from "./place-form"

export function PlacesTab() {
  const {
    places,
    selectedPlaceId,
    placesScreen,
    isCreating,
    isSaving,
    startCreate,
    startEdit,
    handleDelete,
    goToPlacesList,
  } = usePlaceEditor()

  if (placesScreen === "form") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Back to places list"
            onClick={goToPlacesList}
          >
            <ArrowLeft />
          </Button>
          <h3 className="text-sm font-medium">
            {isCreating ? "Add place" : "Edit place"}
          </h3>
        </div>
        <PlaceForm />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Saved places</h3>
        <Button size="sm" onClick={startCreate}>
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </div>

      <ul className="space-y-1">
        {places.map((place) => (
          <li
            key={place.id}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
              selectedPlaceId === place.id
                ? "border-primary bg-muted"
                : "border-border"
            }`}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => startEdit(place)}
            >
              <p className="truncate font-medium">{place.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
              </p>
              {place.tags.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {place.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => void handleDelete(place.id)}
              disabled={isSaving}
            >
              <Trash />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
