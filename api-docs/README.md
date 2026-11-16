# Pathya API docs

- `openapi.yaml` — OpenAPI 3.1 for every endpoint that exists today (source of truth for clients).
- Open it in any OpenAPI viewer (Swagger Editor, Bruno, Insomnia, Postman import).
- Update it in the same change as any route, DTO or error change in `codes/backend/src/{routes,app/dtos,app/http}`.

Planned (platform unit): served at `/api/docs` and generated from the Rust DTOs (utoipa) so it cannot drift.
