# 0001. Static React site on GitHub Pages

- **Status:** proposed
- **Date:** 2026-11-06
- **Slice:** 001

## Context and problem

MarcOna needs a free, mobile-first site that friends can open from a link. The human already decided on GitHub Pages and proposed a stack to confirm here.

## Options considered

- React, TypeScript and Vite, with hash-based routing, Vitest and Playwright
- A lighter framework such as Svelte, which would save little on a site this size
- A host with URL rewrites, such as Netlify, which adds another account for no real gain

## Decision

GitHub Pages at `https://marccompta.github.io/marcona-app/`, with React, TypeScript, Vite, `supabase-js`, hash-based routing, Vitest and Playwright. The stack is well known, and it builds to static files that work under a base path.

## Consequences

- Good: free hosting, deployed from Actions, with no server to run.
- Good: hash routes survive reloads, because Pages can't rewrite URLs.
- Bad: the repo must be public, so nothing secret can ever be committed.
- Bad: Pages serves one site, so the slice under review temporarily replaces `main`.
