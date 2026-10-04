import { LetterCirclePIcon } from "@phosphor-icons/react"

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

type ParkingConditionChipProps = {
  value: number
  className?: string
}

export function ParkingConditionChip({
  value,
  className,
}: ParkingConditionChipProps) {
  const condition = parkingConditionByValue(value)

  if (!condition) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        className={cn(
          "inline-flex cursor-default items-center gap-1 text-xs",
          className
        )}
      >
        <LetterCirclePIcon weight="fill" size={16} />
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
