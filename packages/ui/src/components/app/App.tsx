import 'modern-normalize/modern-normalize.css'
import routes from 'virtual:file-router/routes.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ThemeProvider, Variant } from '../../theme'

const router = createBrowserRouter(routes)

export default function App () {
  return (
    <ThemeProvider variant={Variant.Default}>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
