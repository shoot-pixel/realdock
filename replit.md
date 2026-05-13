# RealDock

## Overview

RealDock is a luxury real estate media delivery SaaS for professional photographers and videographers. Built as a pnpm monorepo with React + TypeScript + Vite frontend, Express API backend, and PostgreSQL + Drizzle ORM.

## Design System — Studio Dark

The app uses a custom premium dark theme called "Studio Dark":
- **Default mode**: Dark (applied in `main.tsx` via `document.documentElement.classList.add('dark')`)
- **Background**: `hsl(225 14% 8%)` — near-black charcoal
- **Primary accent**: `hsl(39 52% 61%)` — warm gold (#C9A96E)
- **Sidebar**: `hsl(225 18% 6%)` — deepest surface
- **Typography**: Playfair Display (serif) for headings, Inter (sans) for body
- **Status badges**: Custom CSS classes in `index.css` — `.badge-active`, `.badge-delivered`, `.badge-draft`, `.badge-archived`, `.badge-editing` — use these instead of shadcn Badge variants
- **Sidebar nav**: Active item has gold left-border (`border-l-2 border-primary`) + `bg-primary/10 text-primary`
- **Sidebar width**: 200px

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks)
- **Build**: esbuild (CJS bundle)

## Architecture

```
artifacts/
  studioflow/     — React + Vite frontend (port 24321, preview path /)
  api-server/     — Express API server (port 8080)
  mockup-sandbox/ — Component preview server (port 8081)
lib/
  api-spec/       — OpenAPI spec (source of truth)
  api-client-react/ — Generated React Query hooks + customFetch
  api-zod/        — Generated Zod schemas
  db/             — Drizzle schema + migrations
```

## Application Features

### Authentication
- Bearer token auth (base64 `userId:random`)
- SHA256 + "studioflow_salt" password hash
- Token stored in `localStorage` as `sf_token`
- Demo: `demo@studioflow.co` / `demo1234`

### Pages
- **Landing** `/` — Marketing page
- **Login** `/login` — Auth with demo credentials hint
- **Register** `/register` — New account signup
- **Dashboard** `/dashboard` — Stats, recent activity, storage overview
- **Projects** `/projects` — Project grid with search/filter
- **New Project** `/projects/new` — Create project form
- **Project Detail** `/projects/:id` — Media grid, AI tools, gallery management
- **Gallery Manage** `/projects/:projectId/gallery/:galleryId` — Gallery settings + share link
- **Gallery Portal** `/gallery/:token` — Public client gallery with lightbox, favorites, comments, downloads
- **Clients** `/clients` — Client contacts management
- **Settings** `/settings` — Profile, subscription plans, AI credits

### AI Tools (Mock)
Job types: `sky_replacement`, `virtual_staging`, `declutter`, `day_to_dusk`, `hdr_enhancement`, `object_removal`, `color_grading`, `furniture_replacement`
Mock processing states progress through [10, 25, 50, 75, 90, 100%]

### Gallery Visibility (Client Access Control)
Three visibility tiers settable from the Gallery Manage page:
- `private` — gallery blocked, API returns 403, portal shows "Gallery Not Available"
- `link_only` — accessible only to those with the share link (default)
- `public` — open to anyone

### Listing Preview (AI Feature)
From the Gallery Portal, clients (or the photographer) can click "Listing Preview" to generate an AI-powered real estate listing for the property. Uses OpenAI (via Replit AI Integrations):
- Generates a luxury headline, full description, 6 property highlights, estimated price
- Shows platform mockups for Zillow, Redfin, Realtor.com, and Compass
- Each platform tab shows the listing with platform-specific branding and styling
- Falls back to sensible defaults if AI is unavailable

### Database Schema (8 tables)
- `users`, `clients`, `projects`, `media_assets`, `ai_jobs`, `galleries`, `gallery_media`, `comments`, `favorites`

## Demo Data
- User: `demo@studioflow.co` / `demo1234` (pro plan)
- 3 clients (Sarah Chen, Marcus Williams, Jennifer Hawthorne)
- 5 projects (Pacific Heights Mansion, Oakwood Residence, Malibu Beach House, Downtown Penthouse, Silicon Valley Office)
- 11 media assets with Unsplash images
- 5 AI jobs in various states
- 1 public gallery at `/gallery/demo-gallery-001`
- Comments and favorites seeded on gallery

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Design System

- Dark-first design with light mode toggle
- Primary color: teal/cyan `hsl(185 65% 45%)`
- Accent: gold/amber `hsl(40 80% 55%)`
- Font: Inter (sans) + Playfair Display (serif)
- No emojis in UI — lucide-react icons only

## API Routes

- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register
- `GET /api/users/me` — Current user
- `PATCH /api/users/me` — Update profile
- `GET /api/dashboard/summary` — Dashboard stats
- `GET /api/dashboard/activity` — Recent activity
- `GET /api/dashboard/storage` — Storage usage
- `GET /api/projects` — List projects (filterable by status)
- `POST /api/projects` — Create project
- `GET /api/projects/:id` — Get project
- `PATCH /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project
- `GET /api/projects/:id/stats` — Project media stats
- `GET /api/projects/:id/media` — List media
- `POST /api/projects/:id/media` — Upload media (mock)
- `GET /api/projects/:id/galleries` — List galleries
- `POST /api/projects/:id/galleries` — Create gallery
- `GET /api/galleries/:id` — Get gallery
- `GET /api/galleries/public/:token` — Public gallery (no auth)
- `POST /api/media/:id/ai-jobs` — Create AI job
- `GET /api/media/:id/ai-jobs` — List AI jobs
- `GET /api/media/:id/comments` — List comments
- `POST /api/media/:id/comments` — Add comment
- `POST /api/media/:id/favorites` — Toggle favorite
- `GET /api/clients` — List clients
- `POST /api/clients` — Create client
- `DELETE /api/clients/:id` — Delete client

See `lib/api-spec/openapi.yaml` for the full API contract.
