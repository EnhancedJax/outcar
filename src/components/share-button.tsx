import { ShareNetwork } from "@phosphor-icons/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

type ShareButtonProps = {
  title: string
  text: string
  url: string
  className?: string
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [status, setStatus] = useState("")

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setStatus("Link copied")
    } catch {
      setStatus("Unable to share link")
    }
    window.setTimeout(() => setStatus(""), 2200)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className={className}
      aria-label={status || "Share link"}
      title={status || "Share link"}
      onClick={() => void handleShare()}
    >
      <ShareNetwork weight="bold" />
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </Button>
  )
}
