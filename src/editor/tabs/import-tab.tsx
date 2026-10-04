import { ArrowSquareIn } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { usePlaceEditor } from "../place-editor-context"

export function ImportTab() {
  const {
    importUrl,
    setImportUrl,
    importListName,
    importPreview,
    isImporting,
    isSaving,
    handleImportPreview,
    handleImportConfirm,
    clearImportPreview,
    updateImportSelection,
  } = usePlaceEditor()

  return (
    <div className="space-y-2">
      <Label htmlFor="google-import-url">Import from Google Maps</Label>
      <div className="flex gap-2">
        <Input
          id="google-import-url"
          value={importUrl}
          onChange={(event) => setImportUrl(event.target.value)}
          placeholder="Place or list link..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void handleImportPreview()
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleImportPreview()}
          disabled={isImporting}
        >
          Preview
        </Button>
      </div>
      {importPreview.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{importListName}</p>
            <p className="text-xs text-muted-foreground">
              {
                importPreview.filter(
                  (item) => item.selected && !item.alreadyExists
                ).length
              }{" "}
              of {importPreview.filter((item) => !item.alreadyExists).length}{" "}
              new places selected
            </p>
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {importPreview.map((item) => (
              <li
                key={item.key}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                  item.alreadyExists ? "opacity-60" : "hover:bg-muted"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={item.selected}
                  disabled={item.alreadyExists}
                  onChange={(event) =>
                    updateImportSelection(item.key, event.target.checked)
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  {item.note ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.note}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </p>
                  {item.alreadyExists ? (
                    <p className="text-xs text-muted-foreground">
                      Already saved
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleImportConfirm}
              disabled={isSaving}
            >
              <ArrowSquareIn data-icon="inline-start" />
              Import selected
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={clearImportPreview}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
