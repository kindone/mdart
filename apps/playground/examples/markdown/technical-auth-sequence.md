# OAuth 2.0 — Authorization Code Flow

```mdart sequence
title: OAuth Flow

- Browser → Auth Server: GET /authorize?client_id=… [+]

- divider: User authenticates

- Auth Server → Browser: 302 + code [-]
- Browser → Auth Server: POST /token (code + PKCE) [+]
- Auth Server → Browser: { access_token, refresh_token } [-]

- divider: API request

- Browser → Resource API: GET /me (Bearer token) [+]

- alt: token valid
  - Resource API → Browser: { id, email, name } [-]
  - else:
    - Resource API → Browser: 401 Unauthorized [-]
```

PKCE is mandatory for all public clients.
