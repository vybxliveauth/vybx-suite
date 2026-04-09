This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Auth Route (Dedicated Page)

The web app now uses a dedicated auth route at `/auth` (instead of only modal-triggered auth).

- Login button flow: `/?...` -> `/auth?next=<current-path>`
- Legacy aliases:
  - `/login` -> `/auth?mode=login`
  - `/register` -> `/auth?mode=register`
  - `/registro` -> `/auth?mode=register`

To move auth UX to a separate domain in Vercel (for example `account.vybxlive.com`), set:

```bash
NEXT_PUBLIC_ACCOUNT_APP_URL=https://account.vybxlive.com
```

When set, login navigation uses that URL (`/auth` path on that domain). If empty, auth stays inside this app (`/auth` local route).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
