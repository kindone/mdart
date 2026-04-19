# OAuth 2.0 — Authorization Code Flow

```mdart sequence
title: OAuth Flow

- Browser
  - → Auth Server: GET /authorize?client_id=…&scope=openid
  - → Auth Server: POST /token (code + PKCE verifier)
  - → Resource API: GET /me  (Bearer token)
- Auth Server
  - → Browser: 302 redirect + code
  - → Browser: { access_token, id_token, refresh_token }
- Resource API
  - → Browser: { id, email, name }
```

PKCE is mandatory for all public clients.
