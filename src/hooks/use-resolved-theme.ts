import { useEffect, useState } from "react"

import { useTheme } from "@/components/theme-provider"

function getResolvedTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function useResolvedTheme() {
  const { theme } = useTheme()
  const [resolvedTheme, setResolvedTheme] = useState(getResolvedTheme)

  useEffect(() => {
    const updateResolvedTheme = () => {
      setResolvedTheme(getResolvedTheme())
    }

    updateResolvedTheme()

    const observer = new MutationObserver(updateResolvedTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaQuery.addEventListener("change", updateResolvedTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener("change", updateResolvedTheme)
    }
  }, [theme])

  return resolvedTheme
}
