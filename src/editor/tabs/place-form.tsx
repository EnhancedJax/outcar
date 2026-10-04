import { useFormContext } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TagChip } from "@/components/tag-chip"
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
  } = usePlaceEditor()

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useFormContext<DraftPlace>()

  const selectedTags = watch("tags")

  const onSubmit = handleSubmit((values) => {
    const applyError = handleApply(values)

    if (!applyError) {
      return
    }

    if (applyError.field) {
      setError(applyError.field, { message: applyError.message })
      return
    }

    setError("root", { message: applyError.message })
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
        <Input
          id="parkingCondition"
          inputMode="numeric"
          aria-invalid={Boolean(errors.parkingCondition)}
          {...register("parkingCondition", {
            validate: validateParkingCondition,
          })}
        />
        {errors.parkingCondition ? (
          <p className="text-xs text-destructive">
            {errors.parkingCondition.message}
          </p>
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

      <div className="flex gap-2">
        <Button type="submit">Done</Button>
        <Button type="button" variant="secondary" onClick={goToPlacesList}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
