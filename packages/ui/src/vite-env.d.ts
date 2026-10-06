/// <reference types="vite/client" />
/// <reference types="vite-react-file-router/client" />

declare module '*.svg?react' {
  import type { ComponentType, SVGProps } from 'react'

  const component: ComponentType<SVGProps<SVGSVGElement>>

  export default component
}
