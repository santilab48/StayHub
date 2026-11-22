/** Accommodation types share one StayHub application and one data model. */
export const accommodationTypes = {
  apartment: { label: 'หอพัก / อพาร์ตเมนต์', defaultBilling: 'monthly', booking: false },
  guesthouse: { label: 'เกสต์เฮาส์', defaultBilling: 'nightly', booking: true },
  daily: { label: 'ที่พักรายวัน', defaultBilling: 'nightly', booking: true },
  homestay: { label: 'โฮมสเตย์', defaultBilling: 'nightly', booking: true },
} as const

export type AccommodationType = keyof typeof accommodationTypes
export type BillingMode = 'monthly' | 'nightly' | 'mixed'

export function isAccommodationType(value: unknown): value is AccommodationType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(accommodationTypes, value)
}

/** A legacy local workspace without this field is still an apartment. */
export function accommodationLabel(value: unknown): string {
  return accommodationTypes[isAccommodationType(value) ? value : 'apartment'].label
}
