type RequestOptions = {
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: string | object
}

type FetchInit = {
  method: string
  headers: Record<string, string>
  body?: string
}

function buildUrl (
  route: string,
  query: Record<string, string>,
): URL {
  const url = new URL(`/api${route}`, window.location.origin)

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }

  return url
}

function makeRequest (
  method: string,
  route: string,
  opts: RequestOptions = {},
): Promise<Response> {
  const {
    headers = {},
    query = {},
    body,
  } = opts

  const init: FetchInit = {
    method,
    headers: { ...headers },
  }

  if (body !== undefined) {
    init.headers['content-type'] ??= 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  return fetch(buildUrl(route, query), init)
}

export default {
  get (route: string, opts?: RequestOptions): Promise<Response> {
    return makeRequest('GET', route, opts)
  },
  post (route: string, opts?: RequestOptions): Promise<Response> {
    return makeRequest('POST', route, opts)
  },
  put (route: string, opts?: RequestOptions): Promise<Response> {
    return makeRequest('PUT', route, opts)
  },
  delete (route: string, opts?: RequestOptions): Promise<Response> {
    return makeRequest('DELETE', route, opts)
  },
}
