# Audire Arcanus - Agent Guidelines

## Project Overview

NestJS Electron app for high-fidelity audio streaming from PC application sources to browser-based lobby listeners with TUI-like interface.

## Commands

- **Build**: `npm run build`
- **Lint**: `npm run lint` (auto-fixes)
- **Format**: `npm run format`
- **Test (single)**: `npm test -- <test-file-name>` or `npm test -- -t "<test-name>"`
- **Test (all)**: `npm test`
- **Test (e2e)**: `npm run test:e2e`
- **Dev**: `npm run start:dev`

## Code Style

- **Imports**: NestJS decorators first, then third-party, then local imports
- **Formatting**: Prettier enforced - single quotes, trailing commas
- **Types**: TypeScript with `strictNullChecks` enabled; explicit types preferred, `any` allowed sparingly
- **Naming**: camelCase for variables/methods, PascalCase for classes, kebab-case for file names
- **Decorators**: Use NestJS decorators (`@Injectable()`, `@Controller()`, `@Get()`, etc.)
- **DI**: Constructor-based dependency injection with `private readonly` parameters
- **Error Handling**: Use NestJS built-in HTTP exceptions and filters
- **ESLint**: Follows `typescript-eslint` recommended type-checked config; floating promises warn, no-explicit-any off
