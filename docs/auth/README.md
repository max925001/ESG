# Authentication & Session Management Reference Guide

This document describes the design, implementation, backend views, and frontend state management of the secure, cookie-based authentication system.

---

## 1. Architecture Overview: Cookies & Memory Hybrid Flow

To balance usability with maximum security against modern web vulnerabilities, the platform implements a hybrid JWT authentication storage pattern:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Browser Client                            │
│                                                                        │
│   ┌──────────────────────────┐          ┌──────────────────────────┐   │
│   │    Zustand Store         │          │   Browser Cookie Jar     │   │
│   │  (In-Memory RAM)         │          │   (HttpOnly; Lax; Secure)│   │
│   │                          │          │                          │   │
│   │   - access_token         │          │    - refresh_token       │   │
│   │   - user profile         │          │                          │   │
│   └─────────────┬────────────┘          └─────────────┬────────────┘   │
└─────────────────┼─────────────────────────────────────┼────────────────┘
                  │                                     │
                  │ (Authorization: Bearer)             │ (Automatic Cookie)
                  ▼                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │                     Django DRF Backend                 │
        │                                                        │
        │      1. Validates Access Token Signature               │
        │      2. Validates Refresh Token against Redis          │
        │      3. Rotates Access / Refresh Tokens                │
        └────────────────────────────────────────────────────────┘
```

### Security Properties
1. **Mitigation of XSS (Cross-Site Scripting)**:
   * The long-lived **refresh token** is stored in an `HttpOnly` cookie. This configuration guarantees that client-side JavaScript (e.g., malicious injected scripts) cannot read or steal the token.
2. **Mitigation of CSRF (Cross-Site Request Forgery)**:
   * The **access token** is stored strictly in memory (Zustand store variables) and is never written to disk or local storage.
   * Although the browser automatically attaches cookies to requests, the backend endpoints that make mutating changes (such as uploading data, editing cells, or approving records) require the `Authorization: Bearer <access_token>` header, neutralizing CSRF attacks since a malicious site cannot read the in-memory access token.
3. **Session Revocation (Redis Whitelist)**:
   * To prevent replay attacks from stolen refresh tokens, every issued refresh token's ID (`jti`) is stored in a Redis database cache.
   * On token rotation or logout, the ID is immediately removed, revoking that session.

---

## 2. Backend Authentication Logic (`apps/users/`)

### Login Endpoint (`LoginView`)
* Location: [views.py](file:///c:/Users/shiva/OneDrive/Desktop/SAP/apps/users/views.py#L44-L81)
* Operations:
  1. Validates the user's email and password via Argon2id hashing.
  2. Generates an access token and a refresh token.
  3. Registers the refresh token `jti` in Redis.
  4. Returns the access token and user metadata in the JSON response body.
  5. Attaches the refresh token as an `HttpOnly`, `SameSite=Lax`, and `Secure` (in non-debug mode) cookie on the response.

### Refresh Endpoint (`CustomTokenRefreshView`)
* Location: [views.py](file:///c:/Users/shiva/OneDrive/Desktop/SAP/apps/users/views.py#L84-L141)
* Operations:
  1. Extracts the refresh token from either the incoming cookies (`refresh_token`) or the JSON payload body.
  2. Decodes the token to find the user's ID.
  3. Queries Redis to verify if the token is present in the active sessions whitelist.
  4. Calls SimpleJWT to validate and rotate tokens. SimpleJWT blacklists the old refresh token.
  5. Deletes the old refresh token from the Redis whitelist and registers the new rotated refresh token.
  6. Returns the new access token in the JSON body, and updates the cookie with the new rotated refresh token.

### Logout Endpoint (`LogoutView`)
* Location: [views.py](file:///c:/Users/shiva/OneDrive/Desktop/SAP/apps/users/views.py#L144-L180)
* Operations:
  1. Deletes the refresh token from the Redis whitelist.
  2. Blacklists the token in SimpleJWT.
  3. Deletes the `refresh_token` cookie by returning a `Set-Cookie` header with an expired timestamp.

---

## 3. Frontend Authentication Logic (`frontend/src/`)

### Zustand Store (`authStore.ts`)
* Location: [authStore.ts](file:///c:/Users/shiva/OneDrive/Desktop/SAP/frontend/src/store/authStore.ts)
* Contains the state for `user`, `accessToken`, and `isAuthenticated`.
* **`checkAuth()` Action**:
  Runs silently when the application is mounted. It executes:
  ```typescript
  const res = await axios.post('/api/v1/auth/refresh/', {}, { withCredentials: true });
  const access = res.data.data.access;
  const meRes = await axios.get('/api/v1/auth/me/', {
    headers: { Authorization: `Bearer ${access}` },
    withCredentials: true
  });
  ```
  This restores the in-memory access token and profile metadata if the user has an active refresh cookie, without requiring credentials input.

### Axios Interceptor Client (`axios.ts`)
* Location: [axios.ts](file:///c:/Users/shiva/OneDrive/Desktop/SAP/frontend/src/lib/axios.ts)
* Configured globally with `withCredentials: true` to enable sharing cookies across origins (development port `3000` to backend port `8000`).
* **Request Interceptor**: Extracts the in-memory `accessToken` from Zustand and appends it as a `Bearer` token inside the `Authorization` header of outgoing requests.
* **Response Interceptor**: Intercepts `401 Unauthorized` responses. If an access token expires:
  1. Locks outgoing requests into a retry queue.
  2. Hits `/api/v1/auth/refresh/` to rotate cookies and get a new access token.
  3. Updates the in-memory Zustand store.
  4. Resubmits all queued requests with the new token.

### Session Mounting (`App.tsx`)
* Location: [App.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SAP/frontend/src/App.tsx#L20-L40)
* Prevents visual flashing or incorrect redirects on page refresh:
  ```typescript
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isInitialized) {
    return <LoaderSpinner />; // Displays full-page loading skeleton
  }
  ```

### Router Guards (`ProtectedRoute.tsx`)
* Location: [ProtectedRoute.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SAP/frontend/src/components/ProtectedRoute.tsx)
* Protects client-side pages. Redirects to `/login` if `isAuthenticated` is false.
* Evaluates `allowedRoles` arrays to prevent unauthorized analysts from rendering manager dashboards.
