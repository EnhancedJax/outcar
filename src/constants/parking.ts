import type { IconProps } from "@phosphor-icons/react"
import {
  CheckCircleIcon,
  ProhibitIcon,
  QuestionIcon,
} from "@phosphor-icons/react"
import type { ComponentType } from "react"

export type ParkingConditionValue = -1 | 0 | 1

export type ParkingConditionDefinition = {
  value: ParkingConditionValue
  title: string
  icon: ComponentType<IconProps>
  description: string
}

export const PARKING_CONDITIONS: readonly ParkingConditionDefinition[] = [
  {
    value: -1,
    title: "未有",
    icon: QuestionIcon,
    description: "未有泊車資訊",
  },
  {
    value: 0,
    title: "有限制",
    icon: ProhibitIcon,
    description:
      "停車位喺上落客區，雙黃線或單黃線旁邊。只要你喺架車附近，泊車就冇問題。",
  },
  {
    value: 1,
    title: "任停",
    icon: CheckCircleIcon,
    description: "唔使擔心俾人抄牌",
  },
]

const parkingConditionMap = new Map(
  PARKING_CONDITIONS.map((condition) => [condition.value, condition])
)

export function isParkingConditionValue(
  value: unknown
): value is ParkingConditionValue {
  return typeof value === "number" && parkingConditionMap.has(value)
}

export function parkingConditionByValue(
  value: number
): ParkingConditionDefinition | undefined {
  return parkingConditionMap.get(value as ParkingConditionValue)
}
