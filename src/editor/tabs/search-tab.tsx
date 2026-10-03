import { MagnifyingGlass } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { usePlaceEditor } from "../place-editor-context"

export function SearchTab() {
  const {
    query,
    setQuery,
    results,
    isSearching,
    handleSearch,
    applySearchResult,
  } = usePlaceEditor()

  return (
    <div className="space-y-2">
      <Label htmlFor="search">Search location</Label>
      <p className="text-xs text-muted-foreground">
        Results apply coordinates to the current or new place draft.
      </p>
      <div className="flex gap-2">
        <Input
          id="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Mapbox..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void handleSearch()
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleSearch()}
          disabled={isSearching}
        >
          <MagnifyingGlass />
        </Button>
      </div>
      {results.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-border p-2">
          {results.map((feature) => (
            <li key={feature.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => applySearchResult(feature)}
              >
                {feature.place_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
