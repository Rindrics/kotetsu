# ADR 0004: Web UI Technology Stack

## Status

Accepted

## Context

We need to build a web application for managing bibliographic data. The application requirements are:

1. Display and search the bibliography
2. Allow the owner to add/edit entries via UI
3. Integrate with GitHub API for file operations (per ADR-0002)
4. Support authentication (owner can write, others can only read)

## Options Considered

### Frontend Framework

| Option | Pros | Cons |
|--------|------|------|
| **React + Next.js** | Largest ecosystem, mature auth (NextAuth.js) | Already familiar, no learning opportunity |
| **Vue + Nuxt** | Lighter than React, good SSG | Less TypeScript-first |
| **SvelteKit** | Lightweight, modern, learning opportunity | Smaller ecosystem |
| **Astro** | Content-focused, multi-framework | Less suitable for interactive apps |

### Hosting Platform

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Pages** | Free, native integration | Static only, no server functions for OAuth |
| **Vercel** | Easy deployment, good DX | Next.js-focused |
| **Cloudflare Pages** | Generous free tier, fast, Workers for OAuth | Slightly more setup |

### UI Library

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind only** | Full control, minimal dependencies | More code to write |
| **DaisyUI** | Easy setup, semantic classes, themes | CSS-only (no JS components) |
| **Skeleton UI** | SvelteKit-native, full components | Heavier, more learning |
| **shadcn-svelte** | Copyable source, accessible | Still maturing |

## Decision

### Selected Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | SvelteKit | Learning opportunity, lightweight, modern |
| **Hosting** | Cloudflare Pages | Generous free tier, Workers for OAuth callback |
| **UI** | Tailwind CSS + DaisyUI | Easy setup, Tailwind knowledge transfers, sufficient for this app |
| **Authentication** | Auth.js (@auth/sveltekit) | Mature library, GitHub provider built-in |

### Why SvelteKit over Next.js

1. **Learning opportunity**: Already proficient with Next.js
2. **Lightweight**: Smaller bundle size, faster builds
3. **Modern DX**: Less boilerplate than React
4. **Auth.js support**: @auth/sveltekit provides similar API to NextAuth.js

### Why Cloudflare Pages over Vercel

1. **Generous free tier**: Unlimited bandwidth
2. **Workers**: Serverless functions for OAuth flow
3. **Performance**: Global edge network
4. **No vendor lock-in**: SvelteKit adapter is official

### Why DaisyUI

1. **Tailwind-based**: Existing Tailwind knowledge applies
2. **Simple integration**: Just a Tailwind plugin
3. **Semantic classes**: `btn btn-primary` vs long utility chains
4. **Themes**: Built-in dark mode and theme switching
5. **Low learning curve**: Focus on SvelteKit, not UI library

## Consequences

### Positive

- Learning new framework (SvelteKit) while building useful tool
- Lightweight, fast application
- Zero hosting cost with Cloudflare free tier
- Auth.js provides secure OAuth implementation

### Negative

- Smaller SvelteKit ecosystem compared to React/Next.js
- May need to implement some components manually
- Less Stack Overflow answers available

## Implementation Notes

1. Use `@sveltejs/adapter-cloudflare` for deployment
2. Configure Auth.js with GitHub OAuth provider
3. Store OAuth credentials in Cloudflare environment variables
4. Use DaisyUI's theme system for dark/light mode
