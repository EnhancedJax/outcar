import { ArrowLeft, NavigationArrow, PersonIcon } from "@phosphor-icons/react"
import { cn } from "cn"

import { useAppState } from "@/app-state"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { gmapStreetViewUrl, NAVIGATION_APPS } from "@/lib/urls"
import type { Place } from "@/types/place"

const frostedButtonClassName =
  "lg:h-9 rounded-full bg-foreground/10 lg:px-5 p-2 backdrop-blur-md hover:bg-foreground/20"

export default function SelectedPlaceControls({
  selectedPlace,
}: {
  selectedPlace: Place
}) {
  const { selectPlace } = useAppState()

  return (
    <div className="pointer-events-auto flex gap-2 lg:mt-4 lg:items-center lg:justify-center">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className={frostedButtonClassName}
        aria-label="Dismiss place details"
        onClick={() => selectPlace(null)}
      >
        <ArrowLeft weight="bold" />
      </Button>
      <Popover>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "lg" }),
            frostedButtonClassName
          )}
        >
          <NavigationArrow weight="fill" />
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
      </Button>
    </div>
  )
}
