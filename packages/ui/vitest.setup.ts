import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL's auto-cleanup is unreliable outside Jest, so unmount explicitly.
afterEach(cleanup)
