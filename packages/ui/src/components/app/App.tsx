import 'modern-normalize/modern-normalize.css'
import routes from 'virtual:file-router/routes.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router'

const router = createBrowserRouter(routes)

export default function App () {
  return <RouterProvider router={router} />
}
