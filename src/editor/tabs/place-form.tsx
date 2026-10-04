import { useFormContext } from "react-hook-form"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TagChip } from "@/components/tag-chip"
import { PARKING_CONDITIONS } from "@/constants/parking"
import { PATH_TYPES } from "@/constants/path"
import {
  validateGmapUrl,
  validateLatitude,
  validateLongitude,
  validateParkingCondition,
} from "@/lib/places"
import type { DraftPlace } from "@/types/place"

import { usePlaceEditor } from "../place-editor-context"

export function PlaceForm() {
  const {
    isCreating,
    tags,
    draftNewTagLabel,
    setDraftNewTagLabel,
    handleApply,
    handleToggleDraftTag,
    handleAddDraftTag,
    goToPlacesList,
    hasNextPlace,
    pathDrawMode,
    isFetchingPath,
    pathDrawingError,
    setPathDrawMode,
    handlePathTypeChange,
    clearPath,
    undoPathPoint,
  } = usePlaceEditor()

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useFormContext<DraftPlace>()

  const selectedTags = watch("tags")
  const pathType = watch("pathType")
  const path = watch("path")

  const applyDraft = (values: DraftPlace, advance: boolean) => {
    const applyError = handleApply(values, { advance })

    if (!applyError) {
      return
    }

    if (applyError.field) {
      setError(applyError.field, { message: applyError.message })
      return
    }

    setError("root", { message: applyError.message })
  }

  const onSubmit = handleSubmit((values) => {
    applyDraft(values, false)
  })

  const onDoneAndNext = handleSubmit((values) => {
    applyDraft(values, true)
  })

  return (
    <form className="space-y-3" onSubmit={onSubmit} noValidate>
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          aria-invalid={Boolean(errors.name)}
          {...register("name", { required: "Name is required" })}
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="id">Id</Label>
        <Input
          id="id"
          aria-invalid={Boolean(errors.id)}
          disabled={!isCreating}
          {...register("id", { required: "Id is required" })}
        />
        {errors.id ? (
          <p className="text-xs text-destructive">{errors.id.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" {...register("note")} />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id)

              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  onClick={() => handleToggleDraftTag(tag.id)}
                >
                  <TagChip catalogTag={tag} />
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add tags in the Tags tab to assign them here.
          </p>
        )}
        <div className="flex gap-2">
          <Input
            value={draftNewTagLabel}
            onChange={(event) => setDraftNewTagLabel(event.target.value)}
            placeholder="Create and assign tag..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleAddDraftTag()
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddDraftTag}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            aria-invalid={Boolean(errors.longitude)}
            {...register("longitude", { validate: validateLongitude })}
          />
          {errors.longitude ? (
            <p className="text-xs text-destructive">
              {errors.longitude.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            aria-invalid={Boolean(errors.latitude)}
            {...register("latitude", { validate: validateLatitude })}
          />
          {errors.latitude ? (
            <p className="text-xs text-destructive">
              {errors.latitude.message}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click the map or drag the selected marker to set coordinates.
      </p>

      <div className="space-y-1">
        <Label htmlFor="parkingCondition">Parking condition</Label>
        <select
          id="parkingCondition"
          aria-invalid={Boolean(errors.parkingCondition)}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"
          )}
          {...register("parkingCondition", {
            validate: validateParkingCondition,
          })}
        >
          {PARKING_CONDITIONS.map((condition) => (
            <option key={condition.value} value={String(condition.value)}>
              {condition.title}
            </option>
          ))}
        </select>
        {errors.parkingCondition ? (
          <p className="text-xs text-destructive">
            {errors.parkingCondition.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pathType">Path</Label>
        <select
          id="pathType"
          aria-invalid={Boolean(errors.pathType)}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"
          )}
          value={pathType}
          onChange={(event) => handlePathTypeChange(event.target.value)}
        >
          {PATH_TYPES.map((pathTypeOption) => (
            <option key={pathTypeOption.value} value={String(pathTypeOption.value)}>
              {pathTypeOption.title}
            </option>
          ))}
        </select>
        {errors.pathType ? (
          <p className="text-xs text-destructive">{errors.pathType.message}</p>
        ) : null}
        {pathType !== "-1" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={pathDrawMode === "roads" ? "default" : "secondary"}
                onClick={() => setPathDrawMode("roads")}
              >
                Follow roads
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pathDrawMode === "points" ? "default" : "secondary"}
                onClick={() => setPathDrawMode("points")}
              >
                Draw points
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={path.length < 2}
                onClick={undoPathPoint}
              >
                Undo
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={clearPath}>
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {pathDrawMode === "roads"
                ? "Click the map to set the route end and snap to roads."
                : pathDrawMode === "points"
                  ? "Click the map to add path points."
                  : "Choose a drawing mode, then click the map."}
            </p>
            {isFetchingPath ? (
              <p className="text-xs text-muted-foreground">Fetching route...</p>
            ) : null}
            {pathDrawingError ? (
              <p className="text-xs text-destructive">{pathDrawingError}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="gmapUrl">Google Maps URL</Label>
        <Input
          id="gmapUrl"
          type="url"
          aria-invalid={Boolean(errors.gmapUrl)}
          {...register("gmapUrl", { validate: validateGmapUrl })}
        />
        {errors.gmapUrl ? (
          <p className="text-xs text-destructive">{errors.gmapUrl.message}</p>
        ) : null}
      </div>

      {errors.root ? (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">Done</Button>
        {!isCreating ? (
          <Button
            type="button"
            variant="secondary"
            disabled={!hasNextPlace}
            onClick={() => void onDoneAndNext()}
          >
            Done & next
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={goToPlacesList}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
