# OAuth / OIDC Providers

All providers expose the same pair of primitives: `startExternalAuth(provider, ctx, opts?)` and `finishExternalAuth(provider, ctx, opts?)`. The provider object captures the per-vendor config.

## Common config

| Field          | Notes                                                            |
|---------------|------------------------------------------------------------------|
| `clientId`     | from the provider's developer console                            |
| `clientSecret` | keep in env, never commit                                         |
| `redirectUri`  | the absolute URL of your callback action                          |
| `scope`        | array of scopes — exact strings depend on the provider            |

## Google

```ts
import { createGoogleAuthProvider } from 'remix/auth'

export const googleProvider = createGoogleAuthProvider({
  clientId:     process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri:  'https://example.com/auth/google/callback',
  scope:        ['openid', 'email', 'profile'],
})
```

The callback's `result` carries `provider`, `profile` (with `id`, `email`, `name`, `picture`), and `tokens`.

## GitHub

```ts
import { createGitHubAuthProvider } from 'remix/auth'

export const githubProvider = createGitHubAuthProvider({
  clientId:     process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri:  'https://example.com/auth/github/callback',
  scope:        ['read:user', 'user:email'],
})
```

GitHub's `email` field can be `null` if the user hides it — call the `/user/emails` endpoint with the access token if you need a confirmed primary email.

## Microsoft

```ts
import { createMicrosoftAuthProvider } from 'remix/auth'

export const microsoftProvider = createMicrosoftAuthProvider({
  clientId:     process.env.MS_CLIENT_ID!,
  clientSecret: process.env.MS_CLIENT_SECRET!,
  redirectUri:  'https://example.com/auth/microsoft/callback',
  scope:        ['openid', 'email', 'profile'],
  tenantId:     'common',     // or your specific tenant
})
```

## Auth0 / Okta

```ts
import { createAuth0AuthProvider, createOktaAuthProvider } from 'remix/auth'

export const auth0Provider = createAuth0AuthProvider({
  domain:       'tenant.auth0.com',
  clientId:     process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  redirectUri:  'https://example.com/auth/auth0/callback',
})

export const oktaProvider = createOktaAuthProvider({
  domain:       'dev-12345.okta.com',
  clientId:     process.env.OKTA_CLIENT_ID!,
  clientSecret: process.env.OKTA_CLIENT_SECRET!,
  redirectUri:  'https://example.com/auth/okta/callback',
})
```

## Facebook & X

```ts
import { createFacebookAuthProvider, createXAuthProvider } from 'remix/auth'
```

Same shape — `clientId`, `clientSecret`, `redirectUri`, `scope`.

## Generic OIDC

For any spec-compliant OpenID Connect issuer:

```ts
import { createOIDCAuthProvider } from 'remix/auth'

export const oidcProvider = createOIDCAuthProvider({
  issuer:        'https://idp.example.com',
  clientId:      process.env.OIDC_CLIENT_ID!,
  clientSecret:  process.env.OIDC_CLIENT_SECRET!,
  redirectUri:   'https://example.com/auth/oidc/callback',
  scope:         ['openid', 'email', 'profile'],
})
```

The provider auto-discovers endpoints from `<issuer>/.well-known/openid-configuration`.

## The standard callback shape

Every provider's callback action looks the same:

```ts
async callback(context: AppContext) {
  const { result, returnTo } = await finishExternalAuth(provider, context)
  const db = context.get(Database)

  // Find or create the auth account
  const authAccount = await db.findOne(authAccounts, {
    where: { provider: result.provider, provider_account_id: result.profile.id },
  }) ?? await createAccount(db, result)

  // Look up the user
  const user = await db.find(users, authAccount.user_id)
  if (!user) return new Response('User missing', { status: 500 })

  // Rotate session, write identity
  const session = completeAuth(context)
  session.set('auth', { userId: user.id, loginMethod: result.provider, authAccountId: authAccount.id })

  return redirect(returnTo ?? routes.account.index.href())
}
```

## State and PKCE

The framework handles the OAuth `state` parameter (CSRF protection) and PKCE for providers that support it — you don't manage these manually.
