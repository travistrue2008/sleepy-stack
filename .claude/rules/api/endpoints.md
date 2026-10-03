# Endpoints

## Return Types

- Middleware and handlers explicitly marked `async`: import `AsyncHandlerResult` from `sleepy-serv` and use it as the return type.
- Middleware and handlers that are **not** explicitly marked `async`: import `HandlerResult` from `sleepy-serv` and use it as the return type.
