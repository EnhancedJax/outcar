import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type TextTransitionProps = {
  text: string
  className?: string
  backspaceSpeed?: number
  typingSpeed?: number
}

export function TextTransition({
  text,
  className,
  backspaceSpeed = 35,
  typingSpeed = 55,
}: TextTransitionProps) {
  const [displayedText, setDisplayedText] = useState(text)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const displayedTextRef = useRef(text)

  useEffect(() => {
    if (displayedTextRef.current === text) {
      setIsTransitioning(false)
      return
    }

    let cancelled = false
    let timeoutId: number | undefined
    setIsTransitioning(true)

    const wait = (duration: number) =>
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, duration)
      })

    async function transitionText() {
      let currentText = displayedTextRef.current

      while (currentText.length > 0 && !cancelled) {
        currentText = currentText.slice(0, -1)
        displayedTextRef.current = currentText
        setDisplayedText(currentText)
        await wait(backspaceSpeed)
      }

      for (const character of text) {
        if (cancelled) {
          return
        }

        currentText += character
        displayedTextRef.current = currentText
        setDisplayedText(currentText)
        await wait(typingSpeed)
      }

      if (!cancelled) {
        setIsTransitioning(false)
      }
    }

    void transitionText()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [backspaceSpeed, text, typingSpeed])

  return (
    <span className={cn("inline-block min-h-[1em]", className)}>
      {displayedText}
      {isTransitioning && (
        <span className="opacity-50" aria-hidden="true">
          _
        </span>
      )}
    </span>
  )
}
