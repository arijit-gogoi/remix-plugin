# Secret Rotation Playbook

Rotating cookie secrets without invalidating active sessions.

## Why rotate

- Compliance: secrets shouldn't live forever.
- Breach response: a leaked secret needs to stop being trusted.
- Best practice on major version upgrades.

## The procedure

The `secrets` array is ordered: index 0 is the *signing* key, all entries are *verifying* keys. Prepend new, drop old after a transition window.

### 1. Prepend the new secret

```ts
createCookie('__session', {
  secrets: [
    process.env.SESSION_SECRET_NEW!,
    process.env.SESSION_SECRET_OLD!,
  ],
})
```

Deploy. Effects:
- New cookies are signed with `NEW`.
- Existing cookies (signed with `OLD`) still verify, so users stay logged in.

### 2. Wait for the transition window

How long? At least as long as your session's `maxAge`. If your cookie lasts 30 days, wait 30 days — by then, every active session has been re-signed at least once with `NEW`.

### 3. Drop the old secret

```ts
createCookie('__session', {
  secrets: [
    process.env.SESSION_SECRET_NEW!,
  ],
})
```

Deploy. Old cookies fail signature verification → users with stale sessions get logged out (rare by this point).

## Breach scenario — fast rotation

If the old secret is exposed, you can't wait for natural expiry — you must log everyone out.

```ts
createCookie('__session', {
  secrets: [
    process.env.SESSION_SECRET_NEW!,
    // OLD secret intentionally dropped immediately
  ],
})
```

All existing sessions are invalidated on next request. Users re-authenticate. Communicate this in advance: it's noticeable.

## Verifying rotation worked

After step 3, parse an old cookie value with the current cookie:

```ts
const value = await sessionCookie.parse(oldCookieHeader)
// Should be `null` — signature no longer verifies
```

If it parses, you haven't actually rotated yet.

## Storing secrets

- Use a secret manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, 1Password CLI).
- Never commit `.env` files containing secrets.
- Audit log every secret read in prod.
- Use long, high-entropy values (≥ 32 bytes base64).

## What rotation does *not* fix

- Active XSS on your site stealing fresh cookies.
- Compromised database (sessions stored server-side).
- Compromised user credentials.

For those: kill sessions explicitly (delete server-side store, change `secrets`, or force-logout via a flag in your user table).
