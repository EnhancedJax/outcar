import { Smiley } from "@phosphor-icons/react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchPhosphorIconNames, TagIcon } from "@/lib/tag-icons"

type TagIconPickerProps = {
  value: string | null
  disabled?: boolean
  onSelect: (icon: string | null) => void
}

export function TagIconPicker({
  value,
  disabled = false,
  onSelect,
}: TagIconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const matches = useMemo(() => searchPhosphorIconNames(query), [query])

  function handleSelect(icon: string) {
    onSelect(icon)
    setOpen(false)
    setQuery("")
  }

  function handleClear() {
    onSelect(null)
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        disabled={disabled}
        aria-label={value ? `Change icon (${value})` : "Choose icon"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value ? <TagIcon name={value} size={16} /> : <Smiley />}
      </Button>

      {open ? (
        <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg border border-border bg-background p-2 shadow-lg">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search icons..."
            autoFocus
          />
          <div className="mt-2 grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
            {matches.map((iconName) => (
              <button
                key={iconName}
                type="button"
                title={iconName}
                className={`flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted ${
                  value === iconName ? "bg-muted ring-1 ring-primary" : ""
                }`}
                onClick={() => handleSelect(iconName)}
              >
                <TagIcon name={iconName} size={18} />
              </button>
            ))}
          </div>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={handleClear}
            >
              Clear icon
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
