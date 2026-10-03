import { useEffect } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { tagKey } from "@/types/place"
import type { DraftPlace } from "@/types/place"

import { usePlaceEditor } from "../place-editor-context"
import type { PlaceFormValues } from "../place-editor-utils"

function isValidCoordinate(value: string) {
  const number = Number(value)
  return value.trim().length > 0 && Number.isFinite(number)
}

export function PlaceForm() {
  const {
    draft,
    isCreating,
    tags,
    draftNewTagLabel,
    setDraftNewTagLabel,
    isSaving,
    onDraftChange,
    handleSave,
    handleToggleDraftTag,
    handleAddDraftTag,
    goToPlacesList,
  } = usePlaceEditor()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<PlaceFormValues>({
    defaultValues: draft ?? undefined,
    mode: "onSubmit",
  })

  const draftId = draft?.id

  useEffect(() => {
    if (!draft) {
      return
    }

    reset({
      id: draft.id,
      name: draft.name,
      note: draft.note,
      longitude: draft.longitude,
      latitude: draft.latitude,
    })
  }, [draft, draftId, reset])

  useEffect(() => {
    if (!draft) {
      return
    }

    setValue("longitude", draft.longitude)
    setValue("latitude", draft.latitude)
  }, [draft?.longitude, draft?.latitude, draft, setValue])

  if (!draft) {
    return null
  }

  function syncCoordinates(field: "longitude" | "latitude", value: string) {
    onDraftChange({ ...draft, [field]: value }, isCreating)
  }

  const longitudeField = register("longitude", {
    required: "Longitude is required",
    validate: (value) =>
      isValidCoordinate(value) || "Enter a valid longitude",
    onChange: (event) => syncCoordinates("longitude", event.target.value),
  })

  const latitudeField = register("latitude", {
    required: "Latitude is required",
    validate: (value) =>
      isValidCoordinate(value) || "Enter a valid latitude",
    onChange: (event) => syncCoordinates("latitude", event.target.value),
  })

  const onSubmit = handleSubmit(async (values) => {
    const nextDraft: DraftPlace = {
      ...draft,
      ...values,
    }

    const saveError = await handleSave(nextDraft)

    if (!saveError) {
      return
    }

    if (saveError.field) {
      setError(saveError.field, { message: saveError.message })
      return
    }

    setError("root", { message: saveError.message })
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
              const isSelected = draft.tags.some(
                (item) => tagKey(item) === tagKey(tag)
              )

              return (
                <button
                  key={tag}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  onClick={() => handleToggleDraftTag(tag)}
                >
                  {tag}
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
                void handleAddDraftTag()
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleAddDraftTag()}
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
            {...longitudeField}
          />
          {errors.longitude ? (
            <p className="text-xs text-destructive">{errors.longitude.message}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            aria-invalid={Boolean(errors.latitude)}
            {...latitudeField}
          />
          {errors.latitude ? (
            <p className="text-xs text-destructive">{errors.latitude.message}</p>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click the map or drag the selected marker to set coordinates.
      </p>

      {errors.root ? (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={goToPlacesList}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
