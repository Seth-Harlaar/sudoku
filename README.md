# Sudoku PWA

An installable, offline-capable Sudoku player. See [PLAN.md](PLAN.md) and
[REQUIREMENTS.md](REQUIREMENTS.md) for design and scope.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server (served from `/`). |
| `npm run build` | Type-check and build to `dist/` (based at `/sudoku/`). |
| `npm run preview` | Preview the production build locally. |
| `npm test` | Run the unit tests (Vitest). |
| `npm run lint` | Lint with ESLint. |
| `npm run deploy` | Build, then publish `dist/` to the `gh-pages` branch. |

## Deploying to GitHub Pages

The app is configured for the project site
**https://seth-harlaar.github.io/sudoku/** (the build `base` is `/sudoku/`).

1. Deploy:
   ```sh
   npm run deploy
   ```
   This runs `predeploy` (a full build) and pushes `dist/` to the `gh-pages`
   branch via the `gh-pages` package.
2. One-time GitHub setup: in the repo's **Settings → Pages**, set
   **Source = Deploy from a branch**, **Branch = `gh-pages` / `root`**.
3. Visit https://seth-harlaar.github.io/sudoku/ after Pages finishes building.

Deploying somewhere else (custom domain, user page, or a different repo name)?
Override the base path at build time:

```sh
VITE_BASE=/ npm run deploy        # custom domain or user/org page
VITE_BASE=/other-repo/ npm run deploy
```
