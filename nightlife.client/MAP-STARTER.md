# Night / Light map starter

Next.js App Router, React, TypeScript and MapLibre GL JS, running on Node.js. Written for the 9 October 2026 client meeting. This is a standalone starter pending the group repository path.

## Run locally

Use Node.js 20.9 or newer (check the installed Next.js version requirements). In this folder:

```sh
npm install
npm run dev
```

Open http://localhost:3000/map. Before merging:

```sh
npm run typecheck
npm run build
```

Dependency installation was declined during authoring. The app has NOT been run or browser-tested. The dependency ranges need a generated lockfile after installation. Map rendering requires WebGL and internet access. No Google key or billing account is used.

## Demo flow

1. Open the map and show the three location entries.
2. Search for Montgomerylaan and select it. If geocoding loads, the map moves to that street.
3. Open the account summary and its source. Explain that it is secondary research.
4. Return to the location, then select Boschdijk.
5. Select Stratumseind and explain it is the group's original project street, with no real testimony attached yet.
6. Explain that street view is a planned integration, not an implemented feature.

## What works in the code

Map navigation and zoom controls, keyboard-accessible marker buttons, street/story search, category filtering, location selection, account summaries, source links, back to location, and mobile layout. The map looks up street overview coordinates through PDOK. It never invents precise incident coordinates. If geocoding or map loading fails, users can still use the list. These are story-area markers, not confirmed physical installations.

## Team integration

- `lib/places.ts`: source-backed account summaries and location metadata.
- `app/page.tsx`: map and selection state. The temporary search/info UI can be replaced with Berna's components. Pass selected place IDs to those components.
- Maria's view should receive the selected ID and location once implemented. No AR or Google Street View is simulated here.
- A separate Express server is unnecessary for this static starter: Next.js already runs on Node.js. Add server routes when genuine backend needs appear.
- Replace live PDOK lookup with reviewed, cached street-centre coordinates before publishing. Keep precision and provenance fields.

## Why this map stack

MapLibre plus OpenFreeMap suits the immediate 2D map task and requires no API key for the public basemap. Dual Maps 3D remains an option for a later Google imagery integration, but adds billing and a larger integration scope. A pitched vector map is not photographic street view or AR.

Official references checked 8 October 2026:

- https://openfreemap.org/quick_start/
- https://openfreemap.org/
- https://nextjs.org/docs/app/getting-started/installation

Keep the basemap attribution visible. The public tile service is an external dependency, not a service guarantee.

## Evidence and limits

See RESEARCH.md. No participant interview was conducted. No one was contacted. No publication permission was obtained. This is a local discussion prototype, not a claim that stories or installations have been approved for public display.
