# AgriMonitor management v1 — setup

This package contains a replacement `src/` frontend entry point for the **manager view only**. It preserves React, TypeScript and ArcGIS. No farmer messaging is included.

## In GitHub (no paid tools)

1. Open `https://github.com/jtunmax/CropManager`, choose **main → View all branches → New branch** and create `feature/manager-foundation`.
2. On that branch, use **Add file → Upload files**, dragging the contents of `agrimonitor_foundation/` (especially `src/` and `index.html`) into the repository root. Ensure paths appear as `src/App.tsx`, `src/main.tsx`, `src/fields.ts`, `src/style.css`, and `index.html`. If GitHub refuses replacement through drag/drop, edit each file in `github.dev` or the standard browser editor.
3. Keep the existing `package.json`, `package-lock.json`, and old code for now. **Do not delete the legacy components yet**. The new `src/main.tsx` does not import them.
4. `index.html` must point to `/src/main.tsx`. Do not put the `agrimonitor_foundation` folder itself at root; upload its contents.
5. Commit on the new branch. Do not merge until local build tests and ArcGIS layer tests pass.
6. To test locally: clone branch, run `npm ci`, `npm run build`, `npm run dev`. The repository's package.json must contain `@arcgis/core`, `react`, and `react-dom` (the inspected repository does).

## Current functionality

- ArcGIS satellite map, polygon sketch workflow, browser-local field registration, selected-field zoom, NDVI overlay toggle, optional SIMIS overlay.
- The known San Lazaro ArcGIS ImageServer URL is built in. Set `VITE_DRONE_NDVI_URL` to change it.
- Does not calculate NDVI from colored tiles, does not persist fields to a server, does not publish imagery, and does not claim field condition or diagnosis.

## Limitations

- The ImageServer's accessibility, type, access rights and metadata still need validation in a running browser.
- The field registry uses localStorage, therefore different computers do not share fields and it is **not operational storage**.
- SIMIS is optional and currently only an overlay; later implement geometry import with persistent SIMIS identifiers.
- Replacing a service's imagery is not equivalent to keeping dated historical survey observations. Maintain an imagery catalogue per flight.
- The old repository is a tree-tracking remix; this replacement isolates the new app without risky mass deletion.
