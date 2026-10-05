import { useAppState } from "@/app-state"
import type { Place } from "@/types/place"

export default function SelectedPlaceImages({
  selectedPlace,
}: {
  selectedPlace: Place
}) {
  const {
    selectedPlaceImages,
    selectedPlaceImagesLoading,
    selectedPlaceImagesError,
  } = useAppState()

  return (
    <>
      {selectedPlaceImagesLoading || selectedPlaceImages.length > 0 ? (
        <div className="scrollbar-hide mb-4 flex flex-row gap-2 overflow-x-scroll px-6 lg:justify-center">
          {selectedPlaceImagesLoading
            ? [...Array(3)].map((_, index) => (
                <div
                  key={`loading-${index}`}
                  className="aspect-square h-16 w-16 animate-pulse rounded-md bg-muted-foreground lg:h-20 lg:w-30"
                  aria-label="Loading place image"
                />
              ))
            : selectedPlaceImages.map((image) => (
                <img
                  key={image.id}
                  src={image.dataUrl}
                  alt={selectedPlace.name}
                  className="aspect-auto h-16 rounded-md object-cover lg:h-20"
                />
              ))}
        </div>
      ) : selectedPlaceImagesError ? (
        <p className="mb-3 text-xs text-destructive">
          {selectedPlaceImagesError}
        </p>
      ) : (
        <></>
      )}
    </>
  )
}
