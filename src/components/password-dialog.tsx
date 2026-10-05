import { useState } from "react"

import { useAuth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PasswordDialog() {
  const { isDialogOpen, closeDialog, signIn } = useAuth()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isDialogOpen) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const signInError = await signIn(password)
    if (signInError) {
      setError(signInError)
    } else {
      setPassword("")
      closeDialog()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-background p-6 shadow-xl"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div>
          <h2 className="text-lg font-medium">Editor access</h2>
          <p className="text-sm text-muted-foreground">
            Enter the editor password to continue.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="editor-password">Password</Label>
          <Input
            id="editor-password"
            type="password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeDialog}>
            Cancel
          </Button>
          <Button type="submit" disabled={!password || isSubmitting}>
            {isSubmitting ? "Checking..." : "Unlock"}
          </Button>
        </div>
      </form>
    </div>
  )
}
