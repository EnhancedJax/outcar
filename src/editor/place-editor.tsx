import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { PlaceEditorProvider, usePlaceEditor } from "./place-editor-context"
import { PlacesTab } from "./tabs/places-tab"
import { TagsTab } from "./tabs/tags-tab"

function PlaceEditorShell() {
  const { activeTab, setActiveTab, error, handleCommit, isDirty, isSaving } =
    usePlaceEditor()

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="font-medium">Places editor</h2>
          <p className="text-sm text-muted-foreground">Dev mode only</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleCommit()}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="p-3 px-4">
          <TabsList className="w-full">
            <TabsTrigger value="places" className="flex-1">
              Places
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex-1">
              Tags
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsContent value="places" className="flex-1 overflow-y-auto p-4">
            <PlacesTab />
          </TabsContent>
          <TabsContent value="tags" className="flex-1 overflow-y-auto p-4">
            <TagsTab />
          </TabsContent>
        </div>
      </Tabs>

      {error ? (
        <p className="border-t border-border px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </aside>
  )
}

export default function PlaceEditor() {
  return (
    <PlaceEditorProvider>
      <PlaceEditorShell />
    </PlaceEditorProvider>
  )
}
