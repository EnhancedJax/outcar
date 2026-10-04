import {
  CheckCircleIcon,
  ProhibitIcon,
  QuestionIcon,
} from "@phosphor-icons/react"
import type { IconProps } from "@phosphor-icons/react"
import { createElement, type ComponentType } from "react"

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { parkingConditionByValue } from "@/constants/parking"
import { cn } from "cn"

const parkingIcons: Record<number, ComponentType<IconProps>> = {
  [-1]: QuestionIcon,
  0: ProhibitIcon,
  1: CheckCircleIcon,
  2: CheckCircleIcon,
  3: CheckCircleIcon,
}

type ParkingConditionChipProps = {
  value: number
  className?: string
}

export function ParkingConditionChip({
  value,
  className,
}: ParkingConditionChipProps) {
  const condition = parkingConditionByValue(value)
  const Icon = parkingIcons[value]

  if (!condition || !Icon) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        className={cn(
          "inline-flex cursor-default items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground",
          className
        )}
      >
        {createElement(Icon, { size: 14, className: "shrink-0" })}
        <span>{condition.title}</span>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-64">
        <PopoverHeader>
          <PopoverTitle className="text-xs">{condition.title}</PopoverTitle>
          <PopoverDescription className="text-xs">
            {condition.description}
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}
