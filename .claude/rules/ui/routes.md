---
paths:
  - "packages/ui/src/components/**/*.tsx"
---

# UI components & routes

- All React components live under `packages/ui/src/components`.
- `src/components/app/App.tsx` is the root application component: global, application-level setup (router, global CSS/font imports, providers). It is the only thing `main.tsx` renders.
- Route-backed components live under `src/components/app`, one `Layout.tsx` + `Page.tsx` pair per route segment. Folder nesting under `components/app` mirrors the URL path, e.g. `/items` maps to `components/app/items/Layout.tsx` and `components/app/items/Page.tsx`.
- A segment's `Layout.tsx` always renders `<Outlet/>` and nothing else beyond any shared chrome for that segment. `Page.tsx` holds that segment's own leaf content and is mounted as its `index` route. The `Outlet` resolves to `Page.tsx` when this segment is the leaf-most match, or to the next nested segment's `Layout.tsx` when the matched path goes deeper (Next.js-style nested layouts) -- this is handled entirely by `react-router`'s nested route tree, not by any conditional logic inside `Layout.tsx`.
- There is no hand-written route table. `vite.config.ts` runs the `vite-react-file-router` plugin, which derives the nested route tree from the folder structure under `src/components/app` and exposes it as the virtual module `virtual:file-router/routes.jsx`. That module exports the route config array, not a router: `App.tsx` builds the router itself with `createBrowserRouter(routes)` at module scope and feeds it into `<RouterProvider>`. Adding a route means adding the `Layout.tsx`/`Page.tsx` pair in the right folder, nothing else. Do not declare routes inline as JSX `<Routes>`/`<Route>` elsewhere in the app, and do not add a `src/routes.tsx`.
- Non-route, reusable components get their own folder under `src/components`, sibling to `app/`. Reserve this for a component that is shared across more than one page.
- Colocated `*.test.tsx` / `*.stories.tsx` keep the same base name as the component they cover (`Page.test.tsx` next to `Page.tsx`), per `.claude/rules/tests.md`. The thin `Layout.tsx` `<Outlet/>` wrappers don't need dedicated tests/stories -- there's no logic to assert beyond "renders its children".

For the rationale behind this structure (why `App.tsx`/`Layout.tsx` split
this way, why the route tree is generated rather than hand-written), the
key benefit is that adding a route means adding the `Layout.tsx`/`Page.tsx`
pair in the right folder -- nothing else.
