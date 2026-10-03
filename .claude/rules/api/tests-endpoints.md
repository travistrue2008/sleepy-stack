---
paths:
  - "packages/api/src/api/**/*.test.ts"
---

# Writing tests

Endpoint test conventions, on top of `@.claude/rules/tests.md`.

## Scope

- Endpoint tests strictly test the endpoint
- Import the `client` from `packages/api/test-helpers.ts`
- Deserialize the response body with `await res.json()` if it's JSON
- Assert the response status code
- Assert the deserialized response body
  - Use `.toBe()` if it's a primitive type (`Boolean`, `Number`, `String`)
  - Use `.toStrictEqual()` if it's an object/array
- Assert database records
  - Select all records from all tables that can be affected by the endpoint`
  - Negative tests
    - Assert that each table does **NOT** have additional entries
    - Assert against inline array of elements
  - Position tests
    - Assert that each table does **NOT** have additional entries
    - Assert against inline array of elements

## Request Body

Test suites which test endpoints that can expect a request body need to provide a `genBody()` function that returns a newly-instantiated object:

```javascript
function genBody () {
  return {
    id: 1,
    email: 'user@qa.com',
    head: {
      sub: 'John',
    },
    list: [
      {
        type: 'mobile',
      },
    ],
  }
}
```

## Top-Level `describe()`

Labeled like this:

```javascript
describe('<METHOD> <ROUTE>', () => {})
```

- `<METHOD>`: endpoint such as `GET`, `POST`, etc.
- `<ROUTE>`:
  - Route path based off of the corresponding endpoint's file structure
  - Ignore the `mountPath` option if it's passed into `createApp()`

## Test Ordering

- Write and order failure cases before the happy-path case within a `describe()` block.
- Each failure case tests exactly one point of failure, unless instructed otherwise.
- Order failure cases as follows:
  1. 415 Errors
  2. 400 Error
  3. 422 Errors
    1. Route params
      - For each:
        - Test if format is invalid
        - Other cases defined in `validateSchema()` for param
    2. Querystring params
      - For each:
        - Test if required
        - Test if has specific format
        - Other cases defined in `validateSchema()` for querystring param
    3. Headers
      - For each:
        - Test if required
        - Test if has specific format
        - Other cases defined in `validateSchema()` for header
    4. Body
      - For each (recursive):
        - Test if required
        - Test if NULL (when not allowed to be NULL)
        - Test if wrong format
        - Other cases defined in `validateSchema()` for body property
  4. 404 Errors
  5. 409 Errors

## Negative Test Case Wording

Consider the API endpoint:

```
PUT /users/:userId

Body: { /* assume that all properties are required */
  id: 1,
  head: {
    sub: 'John',
  },
  list: [
    {
      type: 'mobile',
    },
  ],
}
```

A test should be labeled like this:

```javascript
test('when <SRC>.<PATH> is ...')
```

Where `<SRC>` can be one of:
- `params`
- `query`
- `headers`
- `body`

And `<PATH>` is the path from that source.

Example for dynamic params:
```javascript
test('when "params.userId" is missing')
```

Example for request body where validation applies to all elements:
```javascript
test('when "body.list[*].type" is missing')
```

`<PATH>` in the test name always spells out the full path to the property under test, regardless of case — but the `path` in the resulting error assertion does not always match it literally. A "missing" error is reported against the *parent* that's missing the property (e.g. `path: 'body.head'` for a missing `body.head.sub`), while "NULL" and "wrong format" errors are reported against the property itself (e.g. `path: 'body.head.sub'`), since the property is present in those cases, just invalid. See the two examples below for the concrete difference.

## Negative Test Example

Validate required property that's missing:

```javascript
test('when "body.email" is missing', () => {
  const body = genBody()
  delete body.email

  const res = await client.post('/users/123', { body })
  const result = await res.json()

  expect(res.status).toBe(422)

  expect(result).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'email'`,
    },
  ])
})
```

Validate non-nullable property that's NULL:

```javascript
test('when "body.email" is NULL', () => {
  const body = genBody()

  body.email = null

  const res = await client.post('/users/123', { body })
  const result = await res.json()

  expect(res.status).toBe(422)

  expect(result).toStrictEqual([
    {
      path: 'body.email',
      message: 'must be string',
    },
  ])
})
```

Note the difference from the "missing" case above: a NULL property is still *present*, so the validator reports a type error scoped to that property itself (`path: 'body.email'`), not a "required" error scoped to its parent (`path: 'body'`). The message also reflects the property's actual type (`must be string` here, since `email` is a string) — check the property's own schema for the message it produces.

## Success Test Example

```javascript
test('when invoked', () => {
  const body = genBody()
  const res = await client.post('/users/123', { body })
  const result = await res.json()

  expect(res.status).toBe(200)

  expect(result).toStrictEqual({
    id: 123,
    email: 'user@qa.com',
    head: {
      sub: 'John',
    },
    list: [
      {
        type: 'mobile',
      },
    ],
  })
})
```

## Full Scaffolding Example

Below is a comprehensive example with the following assumptions:
- All `body` properties are recursively required
- Querystring:
  - `filter`: required by validation
    - Variants
      - `all`
      - `some`
  - `optional`:
    - **NOT** required
    - Must be numeric if provided

```javascript
function genBody () {
  return {
    email: 'user@qa.com',
    head: {
      sub: 'John',
    },
    list: [
      {
        type: 'mobile',
      },
    ],
  }
}
```

Negative test cases:

- `when "params.userId" is wrong format`
- `when "querystring.filter" is missing`
- `when "querystring.filter" is NULL`
- `when "querystring.filter" is wrong format`
- `when "querystring.optional" is wrong format`
- `when "headers.token" is wrong format`
- `when "body.email" is missing`
- `when "body.email" is NULL`
- `when "body.email" is wrong format`
- `when "body.head" is missing`
- `when "body.head" is NULL`
- `when "body.head" is wrong format`
- `when "body.head.sub" is missing`
- `when "body.head.sub" is NULL`
- `when "body.head.sub" is wrong format`
- `when "body.list" is missing`
- `when "body.list" is NULL`
- `when "body.list" is wrong format`
- `when "body.list[*]" is missing`
- `when "body.list[*]" is NULL`
- `when "body.list[*]" is wrong format`
- `when "body.list[*].type" is missing`
- `when "body.list[*].type" is NULL`
- `when "body.list[*].type" is wrong format`
