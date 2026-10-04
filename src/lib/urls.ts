export const NAVIGATION_APPS = [
  {
    id: "apple-maps",
    label: "Apple Maps",
    href: (latitude: number, longitude: number) =>
      `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
  },
  {
    id: "google-maps",
    label: "Google Maps",
    href: (latitude: number, longitude: number) =>
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`,
  },
  {
    id: "waze",
    label: "Waze",
    href: (latitude: number, longitude: number) =>
      `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
  },
  {
    id: "amap",
    label: "Amap 高德地圖",
    href: (latitude: number, longitude: number, name: string) => {
      const destination = `${longitude},${latitude},${encodeURIComponent(name)}`

      return `https://uri.amap.com/navigation?to=${destination}&mode=car&coordinate=wgs84&callnative=1&src=outcar`
    },
  },
] as const

export function gmapStreetViewUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`
}
