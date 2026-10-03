export const ItemSortOrder = {
  Asc: 'asc',
  Desc: 'desc',
} as const

export type ItemSortOrder =
  typeof ItemSortOrder[keyof typeof ItemSortOrder]
