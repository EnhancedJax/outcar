import { MotorcycleIcon } from "@phosphor-icons/react"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react"
import { useEffect, useState } from "react"

type AppLoadingProps = {
  isLoading: boolean
}

export default function AppLoading({ isLoading }: AppLoadingProps) {
  const progress = useMotionValue(0)
  const progressWidth = useTransform(progress, (value) => `${value * 100}%`)
  const progressPosition = useTransform(progress, (value) => `${value * 100}%`)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (isLoading) {
      progress.set(0)
      const firstStage = animate(progress, 0.9, {
        duration: 2,
        ease: "easeOut",
      })
      let secondStage: ReturnType<typeof animate> | undefined

      firstStage.then(() => {
        secondStage = animate(progress, 1, {
          duration: 10,
          ease: "linear",
        })
      })

      return () => {
        firstStage.stop()
        secondStage?.stop()
      }
    }

    const completion = animate(progress, 1, {
      duration: 0.8,
      ease: "easeInOut",
    })

    void completion.then(() => setIsExiting(true))

    return () => completion.stop()
  }, [isLoading, progress])

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-linear-to-t from-background to-background/0"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
          style={{ transformOrigin: "top" }}
          aria-label="Loading application"
          role="status"
        >
          <div className="relative mx-4 pb-8">
            <div className="mb-3 flex items-end justify-between gap-4">
              <span className="animate-pulse font-mono text-sm tracking-[0.2em] text-muted-foreground uppercase">
                正在加載...
              </span>
              <div className="absolute bottom-0 w-[calc(100%-24px)]">
                <motion.div
                  className="absolute bottom-10 z-10"
                  style={{ left: progressPosition }}
                  animate={{ y: [0, -1, 0], rotate: [0, -45, -60, 10, 0] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                    ease: "easeInOut",
                  }}
                >
                  <MotorcycleIcon
                    className="text-foreground"
                    size={24}
                    weight="fill"
                    aria-hidden="true"
                  />
                </motion.div>
              </div>
            </div>

            <div className="h-1 w-full overflow-visible rounded-full bg-foreground/15">
              <motion.div
                className="h-full rounded-full bg-foreground"
                style={{ width: progressWidth }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
