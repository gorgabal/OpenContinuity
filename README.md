# openContinuity

A web app for tracking continuity on movie sets - characters, costumes, scenes, and shooting schedules.

## Tech Stack

- **Frontend**: React 19 + Vite
- **Local DB**: RxDB with Dexie storage (offline-first)
- **Backend**: Supabase (planned for sync/backup)
- **UI**: Flowbite React + Tailwind CSS + DaisyUI
- **Routing**: React Router DOM
- **Package Manager**: pnpm

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start dev server:
   ```bash
   pnpm run dev
   ```

3. Open http://localhost:5173

## Scripts

- `pnpm run dev` - Development server
- `pnpm run build` - Production build
- `pnpm run preview` - Preview build
- `pnpm run lint` - ESLint

## Architecture Notes

- RxDB handles local storage and offline capability
- Supabase will sync data across devices and provide backup
- Reactive data flow using RxJS observables
- Component-based UI with Flowbite for consistent styling

## Current Status

Early development. Core database structure and basic UI components in place.

## TODO

- Connect UI to data sources
- Add CRUD operations for continuity data
- Character detail pages (separate from costumes)
- Quick filters for scene overview and shooting day pages
- Supabase integration for data sync