import {
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from "@phosphor-icons/react"
import * as Lightbox from "@ramka/react/lightbox"

import { useAppState } from "@/app-state"
import type { Place, PlaceImage } from "@/types/place"

const lightboxButtonClassName =
  "inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-opacity hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"

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

  if (selectedPlaceImagesLoading) {
    return (
      <div className="scrollbar-hide mb-4 flex flex-row gap-2 overflow-x-scroll px-6 lg:justify-center">
        {[...Array(3)].map((_, index) => (
          <div
            key={`loading-${index}`}
            className="aspect-square h-16 w-16 animate-pulse rounded-md bg-muted-foreground lg:h-20 lg:w-30"
            aria-label="Loading place image"
          />
        ))}
      </div>
    )
  }

  if (selectedPlaceImagesError && selectedPlaceImages.length === 0) {
    return (
      <p className="mb-3 text-xs text-destructive">
        {selectedPlaceImagesError}
      </p>
    )
  }

  if (selectedPlaceImages.length === 0) {
    return null
  }

  return (
    <Lightbox.Root
      license="gpl"
      scrollTriggerIntoView={[
        { type: "onChange", behavior: "instant", inline: "center" },
        { type: "onOpenComplete", behavior: "instant", inline: "center" },
      ]}
    >
      <div className="scrollbar-hide pointer-events-auto mb-4 flex flex-row gap-2 overflow-x-scroll px-6 lg:justify-center">
        {selectedPlaceImages.map((image, index) => (
          <Lightbox.Trigger
            key={image.id}
            index={index}
            aria-label={`View photo ${index + 1} of ${selectedPlaceImages.length}`}
            className="inline-flex shrink-0 cursor-zoom-in overflow-hidden rounded-md p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {({ imageRef }) => (
              <img
                ref={imageRef}
                src={image.dataUrl}
                alt=""
                draggable={false}
                className="pointer-events-none h-16 rounded-md object-cover lg:h-20"
              />
            )}
          </Lightbox.Trigger>
        ))}
      </div>

      <PlaceImageViewer
        images={selectedPlaceImages}
        placeName={selectedPlace.name}
      />
    </Lightbox.Root>
  )
}

function PlaceImageViewer({
  images,
  placeName,
}: {
  images: PlaceImage[]
  placeName: string
}) {
  const multiple = images.length > 1

  return (
    <Lightbox.Portal className="relative z-[100]">
      <Lightbox.Backdrop className="fixed inset-0 bg-black/80 [opacity:calc(1-var(--lightbox-pull-progress,0))] data-[pull-snapping]:[transition:opacity_var(--lightbox-pull-snap-duration,300ms)_var(--lightbox-pull-snap-easing,ease)]" />
      <Lightbox.Content
        aria-label={`${placeName} photos`}
        className="fixed inset-0 flex flex-col text-white outline-none"
      >
        <Lightbox.Slides
          aria-label="Photos"
          aria-roledescription="carousel"
          className="min-h-0 flex-1"
        >
          {images.map((image, index) => (
            <Lightbox.Slide
              key={image.id}
              className="h-full min-w-full flex-[0_0_100%] p-4 pt-16 pb-8 sm:p-8"
            >
              <Lightbox.Item
                index={index}
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${images.length}`}
              >
                <Lightbox.Zoom>
                  <Lightbox.Media className="overflow-hidden rounded-md">
                    <img
                      src={image.dataUrl}
                      alt={`${placeName} photo ${index + 1}`}
                      draggable={false}
                    />
                  </Lightbox.Media>
                </Lightbox.Zoom>
              </Lightbox.Item>
            </Lightbox.Slide>
          ))}
        </Lightbox.Slides>

        {multiple ? (
          <Lightbox.Counter className="absolute top-4 left-4 text-sm [opacity:calc(1-var(--lightbox-zoom-progress,0))]" />
        ) : null}

        {multiple ? (
          <>
            <Lightbox.Previous
              aria-label="Previous photo"
              className={`${lightboxButtonClassName} absolute top-1/2 left-3 -translate-y-1/2 [opacity:calc(1-var(--lightbox-zoom-progress,0))]`}
            >
              <CaretLeftIcon weight="bold" />
            </Lightbox.Previous>
            <Lightbox.Next
              aria-label="Next photo"
              className={`${lightboxButtonClassName} absolute top-1/2 right-3 -translate-y-1/2 [opacity:calc(1-var(--lightbox-zoom-progress,0))]`}
            >
              <CaretRightIcon weight="bold" />
            </Lightbox.Next>
          </>
        ) : null}

        <div className="absolute top-4 right-4 flex gap-2 [opacity:calc(1-var(--lightbox-zoom-progress,0))]">
          <Lightbox.ZoomOut
            aria-label="Zoom out"
            className={lightboxButtonClassName}
          >
            <MagnifyingGlassMinusIcon />
          </Lightbox.ZoomOut>
          <Lightbox.ZoomIn
            aria-label="Zoom in"
            className={lightboxButtonClassName}
          >
            <MagnifyingGlassPlusIcon />
          </Lightbox.ZoomIn>
          <Lightbox.Close
            aria-label="Close"
            className={lightboxButtonClassName}
          >
            <XIcon />
          </Lightbox.Close>
        </div>
      </Lightbox.Content>
    </Lightbox.Portal>
  )
}
