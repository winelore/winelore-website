# v0-wine-lore-dashboard-design

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_Yjxeu4xO82cHimh8RMFs4bPehqHW)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Set the optional server environment variable `AXUS_RATE_LIMIT_TOKEN` to an AXUS ID
bearer token granted `identity.<auid>.ratelimit.drain`. Winelore's server-side AXUS
GraphQL requests, including display-name, avatar metadata, and username lookups,
then consume that account's rate-limit budget. AXUS ID selects the account when
the token can drain multiple accounts. An explicitly supplied request bearer
takes precedence; without the setting, requests retain their existing behavior.
The setting applies to GraphQL, not the OAuth token/revocation endpoints or public
avatar downloads. Keep it server-side: do not use a `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
variable or bundle it into the mobile app. A revoked token or one without drain
permission falls back to AXUS ID's IP rate limit; AXUS ID still decides access to
each operation using the supplied bearer.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/zxc-shadow/v0-wine-lore-dashboard-design" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
