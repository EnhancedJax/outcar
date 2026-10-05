import { ArrowSquareOutIcon } from "@phosphor-icons/react"
import { Button } from "./ui/button"

export default function Attribution() {
  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <img src="/pfp.png" alt="PFP" className="h-6 w-6 rounded-full" />
        Made by Jax ⋅ 香港製造
      </div>
      <Button
        variant="default"
        size="sm"
        onClick={() => {
          window.open("https://jaxtam.dev", "_blank")
        }}
      >
        <ArrowSquareOutIcon size={16} />
      </Button>
    </div>
  )
}
