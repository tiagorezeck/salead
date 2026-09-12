# COMET CRM — AI Development Rules

## Tech Stack Summary
- **Framework**: React 19 with **TanStack Start** (Vite-based SSR/SPA framework).
- **Routing**: **TanStack Router** with file-based routing (located in `src/routes/`).
- **State & Data**: **TanStack Query** (React Query) for server state management.
- **Styling**: **Tailwind CSS v4** using the new `@import "tailwindcss"` syntax and CSS variables for theme tokens.
- **Components**: **shadcn/ui** (Radix UI primitives) for accessible, unstyled components.
- **Icons**: **Lucide React** for consistent iconography.
- **Forms**: **React Hook Form** combined with **Zod** for schema-based validation.
- **Charts**: **Recharts** for data visualization and analytics.
- **Notifications**: **Sonner** for toast notifications.

## Library Usage Rules

### 1. Routing & Navigation
- Always use `Link` from `@tanstack/react-router` for internal navigation.
- Define new routes in `src/routes/` using the `.tsx` extension.
- Use `useNavigate` for programmatic navigation.

### 2. Styling & Design System
- Use Tailwind utility classes for all styling.
- Reference theme variables (e.g., `var(--primary)`, `var(--background)`) via Tailwind classes (e.g., `bg-primary`, `text-foreground`).
- Follow the "Comet" design language: Graphite backgrounds, Orange/Glow accents, and elegant shadows (`shadow-elegant`).
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging.

### 3. Components
- Prefer existing **shadcn/ui** components in `src/components/ui/`.
- Create new shared components in `src/components/` and keep them small (under 100 lines).
- Use **Lucide React** for all icons to maintain visual consistency.

### 4. Data Fetching & State
- Use **TanStack Query** for all API interactions or data loading.
- Keep mock data in `src/data/mock.ts` until a real backend is integrated.
- Use `createFileRoute` context for route-level data requirements.

### 5. Forms & Validation
- Use **Zod** to define schemas for any user input.
- Integrate schemas with **React Hook Form** using the `@hookform/resolvers/zod` resolver.

### 6. Code Structure
- **Pages**: Located in `src/routes/`.
- **Components**: Located in `src/components/`.
- **Hooks**: Located in `src/hooks/`.
- **Utils/Lib**: Located in `src/lib/`.
- **Data/Mocks**: Located in `src/data/`.