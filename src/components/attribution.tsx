import { ArrowSquareOutIcon } from "@phosphor-icons/react"
import { buttonVariants } from "./ui/button"

export default function Attribution() {
  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <img src="/pfp.png" alt="PFP" className="h-6 w-6 rounded-full" />
        Made by Jax ⋅ 香港製造
      </div>
      <a
        href="https://jaxtam.dev/hk"
        target="_blank"
        className={buttonVariants({ variant: "default", size: "default" })}
      >
        <ArrowSquareOutIcon size={16} weight="regular" />
      </a>
    </div>
  )
}
