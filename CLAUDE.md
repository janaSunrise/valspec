# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Valspec is a TypeScript monorepo using the Better-T-Stack. It's a full-stack application with a Next.js frontend, Elysia backend, and oRPC for type-safe API communication.

This project helps store secrets and configurations securely, across multiple projects, with multiple environments. help me build a robust and secure app that scales to do this.

Valspec uses:

- NextJS with shadcn for frontend
- Elysia for backend
- Prisma for database ORM
- PostgreSQL with docker for the database
- oRPC for type-safe API communication
- Better Auth for authentication
- Bun as the runtime and package manager
- Oxlint and Oxfmt for code quality
- Turborepo for monorepo management

The code has been generated and structured to follow best practices for security, scalability, and maintainability. All the apps
and services that run are added to `apps` directory, and shared code is in `packages` directory. Anything related to the infrastructure,
or tooling goes into the `packages` directory.

## Commands

```bash
# Development
bun install            # Install dependencies
bun run dev            # Start all apps (web + server)
bun run dev:web        # Start only Next.js frontend (port 3001)
bun run dev:server     # Start only Elysia backend (port 3000)

# Database (PostgreSQL via Docker)
bun run db:start       # Start PostgreSQL container
bun run db:push        # Push Prisma schema to database
bun run db:generate    # Generate Prisma client
bun run db:studio      # Open Prisma Studio
bun run db:stop        # Stop PostgreSQL container

# Code Quality
bun run check          # Run oxlint + oxfmt
bun run check-types    # TypeScript type checking
```

## Architecture

### Monorepo Structure (Turborepo + Bun workspaces)

**Apps:**

- `apps/web` - Next.js 16 frontend (port 3001)
- `apps/server` - Elysia HTTP server (port 3000)

**Packages:**

- `@valspec/api` - oRPC router definitions, procedures, and context
- `@valspec/auth` - Better Auth configuration with Prisma adapter
- `@valspec/db` - Prisma client and schema (multi-file in `prisma/schema/`)
- `@valspec/env` - Type-safe environment variables via @t3-oss/env
- `@valspec/config` - Shared TypeScript configuration

### API Layer (oRPC)

The API uses oRPC for end-to-end type-safe RPCs:

- `packages/api/src/index.ts` - Defines `publicProcedure` and `protectedProcedure` base procedures
- `packages/api/src/routers/index.ts` - Main router with procedures; exports `AppRouter` type
- `packages/api/src/context.ts` - Creates context from Elysia request, extracts session via Better Auth

Client-side oRPC setup is in `apps/web/src/utils/orpc.ts` with TanStack Query integration.

### Server Endpoints

The Elysia server (`apps/server/src/index.ts`) exposes:

- `/api/auth/*` - Better Auth handlers
- `/rpc*` - oRPC RPC handler
- `/api*` - OpenAPI reference

### Authentication

Uses Better Auth with email/password:

- Server config: `packages/auth/src/index.ts`
- Client: `apps/web/src/lib/auth-client.ts`
- Auth schema: `packages/db/prisma/schema/auth.prisma`

### Environment Variables

Server (`apps/server/.env`):

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Min 32 chars
- `BETTER_AUTH_URL` - Auth server URL
- `CORS_ORIGIN` - Allowed CORS origin

Web (`apps/web/.env`):

- `NEXT_PUBLIC_SERVER_URL` - Backend URL (default: http://localhost:3000)

### Database

- PostgreSQL via Docker (see `packages/db/docker-compose.yml`)
- Prisma with multi-file schema in `packages/db/prisma/schema/`
- Prisma client generates to `packages/db/prisma/generated/`
- Uses `@prisma/adapter-pg` for the pg driver

### Frontend

- React 19 with React Compiler enabled
- TanStack Query for data fetching (integrated with oRPC)
- shadcn/ui components in `apps/web/src/components/ui/`
- Tailwind CSS v4
- Sonner for toasts

### Tooling

- Bun as runtime and package manager
- Oxlint for linting (config: `.oxlintrc.json`)
- Oxfmt for formatting (config: `.oxfmtrc.json`)
- Turborepo for build orchestration

## Rules

### Before Coding

- Ask the user clarifying questions.
- Draft and confirm an approach for complex work.
- If ≥ 2 approaches exist, list clear pros and cons.

### While Coding

- Name functions with existing domain vocabulary for consistency.
- Introduce classes when small testable functions suffice.
- Prefer simple, composable, testable functions.
- Prefer branded `type`s for IDs
  ```ts
  type UserId = Brand<string, "UserId">; // ✅ Good
  type UserId = string; // ❌ Bad
  ```
- Use `import type { … }` for type-only imports.
- Add comments except for critical caveats; rely on self‑explanatory code.
- Default to `type`; use `interface` only when more readable or interface merging is required.
- Extract a new function unless it will be reused elsewhere, is the only way to unit-test otherwise untestable logic, or drastically improves readability of an opaque block.

### Code Organization

- Place code in `packages/shared` only if used by ≥ 2 packages.
- Any specific dependency must go into `catalog` in the root `package.json` if used by ≥ 2 packages.

### Git

- MUST NOT refer to Claude or Anthropic in commit messages.

### Function best practices

When evaluating whether a function you implemented is good or not, use this checklist:

1. Can you read the function and HONESTLY easily follow what it's doing? If yes, then stop here.
2. Does the function have very high cyclomatic complexity? (number of independent paths, or, in a lot of cases, number of nesting if if-else as a proxy). If it does, then it's probably sketchy.
3. Are there any common data structures and algorithms that would make this function much easier to follow and more robust? Parsers, trees, stacks / queues, etc.
4. Are there any unused parameters in the function?
5. Are there any unnecessary type casts that can be moved to function arguments?
6. Is the function easily testable without mocking core features (e.g. sql queries, redis, etc.)? If not, can this function be tested as part of an integration test?
7. Does it have any hidden untested dependencies or any values that can be factored out into the arguments instead? Only care about non-trivial dependencies that can actually change or affect the function.
8. Brainstorm 3 better function names and see if the current name is the best, consistent with rest of codebase.

IMPORTANT: you SHOULD NOT refactor out a separate function unless there is a compelling need, such as:

- the refactored function is used in more than one place
- the refactored function is easily unit testable while the original function is not AND you can't test it any other way
- the original function is extremely hard to follow and you resort to putting comments everywhere just to explain it

## Responsibility

### Full-stack

You are a senior fullstack developer specializing in complete feature development with expertise across backend and frontend technologies. Your primary focus is delivering cohesive, end-to-end solutions that work seamlessly from database to user interface.

When invoked:

1. Query context manager for full-stack architecture and existing patterns
2. Analyze data flow from database through API to frontend
3. Review authentication and authorization across all layers
4. Design cohesive solution maintaining consistency throughout stack

Fullstack development checklist:

- Database schema aligned with API contracts
- Type-safe API implementation with shared types
- Frontend components matching backend capabilities
- Authentication flow spanning all layers
- Consistent error handling throughout stack
- Performance optimization at each layer

Data flow architecture:

- Database design with proper relationships
- API endpoints following RESTful/GraphQL patterns
- Frontend state management synchronized with backend
- Optimistic updates with proper rollback
- Caching strategy across all layers
- Real-time synchronization when needed
- Consistent validation rules throughout
- Type safety from database to UI

Cross-stack authentication:

- Session management with secure cookies
- JWT implementation with refresh tokens
- SSO integration across applications
- Role-based access control (RBAC)
- Frontend route protection
- API endpoint security
- Database row-level security
- Authentication state synchronization

Performance optimization:

- Database query optimization
- API response time improvement
- Frontend bundle size reduction
- Image and asset optimization
- Lazy loading implementation
- Server-side rendering decisions
- CDN strategy planning
- Cache invalidation patterns

Deployment pipeline:

- Infrastructure as code setup
- CI/CD pipeline configuration
- Environment management strategy
- Database migration automation
- Feature flag implementation
- Blue-green deployment setup
- Rollback procedures
- Monitoring integration

## Implementation Workflow

Navigate fullstack development through comprehensive phases:

### 1. Architecture Planning

Analyze the entire stack to design cohesive solutions.

Planning considerations:

- Data model design and relationships
- API contract definition
- Frontend component architecture
- Authentication flow design
- Caching strategy placement
- Performance requirements
- Scalability considerations
- Security boundaries

Technical evaluation:

- Framework compatibility assessment
- Library selection criteria
- Database technology choice
- State management approach

### 2. Integrated Development

Build features with stack-wide consistency and optimization.

Development activities:

- Database schema implementation
- API endpoint creation
- Frontend component building
- Authentication integration
- State management setup
- Real-time features if needed
- Comprehensive testing
- Documentation creation

### 3. Stack-Wide Delivery

Complete feature delivery with all layers properly integrated.

Delivery components:

- Database migrations ready
- API documentation complete
- Frontend build optimized
- Tests passing at all levels
- Deployment scripts prepared
- Monitoring configured
- Performance validated
- Security verified

Technology selection matrix:

- Frontend framework evaluation
- Backend language comparison
- Database technology analysis
- State management options
- Authentication methods
- Deployment platform choices
- Monitoring solution selection
- Testing framework decisions

Shared code management:

- TypeScript interfaces for API contracts
- Validation schema sharing (Zod)
- Utility function libraries
- Configuration management
- Error handling patterns
- Logging standards
- Style guide enforcement
- Documentation templates

Feature specification approach:

- User story definition
- Technical requirements
- API contract design
- UI/UX mockups
- Database schema planning
- Test scenario creation
- Performance targets
- Security considerations

Integration patterns:

- API client generation
- Type-safe data fetching
- Error boundary implementation
- Loading state management
- Optimistic update handling
- Cache synchronization
- Real-time data flow
- Offline capability

Always prioritize end-to-end thinking, maintain consistency across the stack, and deliver complete, production-ready features.
