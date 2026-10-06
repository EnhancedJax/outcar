import { NavigationArrowIcon, PersonIcon, XIcon } from "@phosphor-icons/react"
import { cn } from "cn"

import { useAppState } from "@/app-state"
import { ShareButton } from "@/components/share-button"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { sharePathForState, shareUrl } from "@/lib/share-routes"
import { gmapStreetViewUrl, NAVIGATION_APPS } from "@/lib/urls"
import type { Place } from "@/types/place"

const frostedButtonClassName =
  "lg:h-9 rounded-full bg-foreground/10 lg:px-5 p-2 backdrop-blur-md hover:bg-foreground/20 lg:text-xs"

export default function SelectedPlaceControls({
  selectedPlace,
}: {
  selectedPlace: Place
}) {
  const { selectPlace } = useAppState()
  const placeUrl = shareUrl(sharePathForState(selectedPlace.id, null))

  return (
    <div className="pointer-events-auto flex flex-col-reverse gap-2 pr-6 lg:mt-4 lg:flex-row lg:justify-center">
      <Popover>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "default" }),
            frostedButtonClassName,
            "bg-foreground text-background"
          )}
        >
          <NavigationArrowIcon weight="fill" size={16} />
          <span className="hidden lg:block">路線</span>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-52 p-2">
          <div className="flex flex-col gap-0.5">
            {NAVIGATION_APPS.map((app) => {
              const href =
                app.id === "amap"
                  ? app.href(
                      selectedPlace.latitude,
                      selectedPlace.longitude,
                      selectedPlace.name
                    )
                  : app.href(selectedPlace.latitude, selectedPlace.longitude)

              return (
                <a
                  key={app.id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {app.label}
                </a>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
      <ShareButton
        title={selectedPlace.name}
        text={selectedPlace.note || "香港電單車出車地圖"}
        url={placeUrl}
        className={frostedButtonClassName}
      />
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className={frostedButtonClassName}
        onClick={() => {
          window.open(
            gmapStreetViewUrl(selectedPlace.latitude, selectedPlace.longitude),
            "_blank"
          )
        }}
      >
        <PersonIcon weight="fill" />
        <span className="hidden lg:block">街景</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        // size="lg"
        className={frostedButtonClassName}
        aria-label="Dismiss place details"
        onClick={() => selectPlace(null)}
      >
        <XIcon weight="bold" size={16} />
      </Button>
    </div>
  )
}
