import { Desktop, GearIcon, Moon, Sun } from "@phosphor-icons/react"
import { cn } from "cn"
import { useCallback, useEffect, useRef, useState } from "react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { MapAppearance } from "@/lib/mapbox"
import { MAX_PITCH, MIN_PITCH } from "@/lib/settings"

const PANEL_MS = 220

const THEME_OPTIONS = [
  { value: "system", label: "系統", icon: Desktop },
  { value: "light", label: "亮色", icon: Sun },
  { value: "dark", label: "暗色", icon: Moon },
] as const

export default function MapAppearanceControl({
  mapAppearance,
  setMapAppearance,
  pitch,
  onPitchChange,
}: {
  mapAppearance: MapAppearance
  setMapAppearance: (mapAppearance: MapAppearance) => void
  pitch: number
  onPitchChange: (pitch: number) => void
}) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const closeTimerRef = useRef<number | null>(null)

  const closePanel = useCallback(() => {
    setShown(false)

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }

    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, PANEL_MS)
  }, [])

  const openPanel = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    setOpen(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShown(true))
    })
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closePanel, open])

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute top-4 right-4 z-50 shadow-lg"
        aria-expanded={shown}
        aria-label="Map settings"
        onClick={() => {
          if (shown) {
            closePanel()
            return
          }

          openPanel()
        }}
      >
        <GearIcon />
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Dismiss map settings"
            className={cn(
              "absolute inset-0 z-30 cursor-default bg-transparent transition-opacity duration-200",
              shown ? "opacity-100" : "opacity-0"
            )}
            onClick={closePanel}
          />
          <div
            role="dialog"
            aria-label="Map settings"
            className={cn(
              "absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out",
              shown ? "translate-y-0" : "translate-y-full"
            )}
          >
            <div className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-2">
                <Label>地圖</Label>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      mapAppearance === "monochrome" ? "default" : "ghost"
                    }
                    aria-pressed={mapAppearance === "monochrome"}
                    onClick={() => setMapAppearance("monochrome")}
                  >
                    黑白
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mapAppearance === "colored" ? "default" : "ghost"}
                    aria-pressed={mapAppearance === "colored"}
                    onClick={() => setMapAppearance("colored")}
                  >
                    彩色
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>主題</Label>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                  {THEME_OPTIONS.map((option) => {
                    const Icon = option.icon

                    return (
                      <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant={theme === option.value ? "default" : "ghost"}
                        aria-pressed={theme === option.value}
                        onClick={() => setTheme(option.value)}
                      >
                        <Icon />
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="map-pitch">傾斜度</Label>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {pitch}°
                  </span>
                </div>
                <input
                  id="map-pitch"
                  type="range"
                  min={MIN_PITCH}
                  max={MAX_PITCH}
                  step={1}
                  value={pitch}
                  aria-valuemin={MIN_PITCH}
                  aria-valuemax={MAX_PITCH}
                  aria-valuenow={pitch}
                  className="w-full cursor-pointer accent-foreground"
                  onChange={(event) => {
                    onPitchChange(Number(event.target.value))
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
