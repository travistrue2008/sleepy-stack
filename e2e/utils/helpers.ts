export const HttpStatus = {
  NoContent: 204,
} as const

export function getBaseUrl (): string {
  return `http://localhost:${process.env.UI_PORT}`
}
