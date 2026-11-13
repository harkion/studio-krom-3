# Street View migration - Fahri Can

The `/street-view` route replaces the retired map. `/map` redirects here. Run `npm install` then `npm run dev` inside nightlife.client.

Converted the supplied 3d-streetview-main from: https://git.fhict.nl/I553917/3d-streetview into a client-only Next.js TypeScript scene and scoped CSS. Three.js is pinned to the version used by the ZIP. The existing backend and story submission remain unchanged.

<!-- The ZIP has no models/street.glb or station2.mp3. The procedural street is retained; the first station reports unavailable audio. Only one copy of station1.mp3 is stored at public/street-view/audio/station1.mp3. This is a generated 3D environment, not photographic Google Street View or AR. -->

Controls: a short, blurred welcome message fades automatically before walking begins. Desktop uses arrows/WASD. On mobile, swipe to look around and touch-drag from anywhere along the lower part of the scene to move with the temporary joystick; two fingers can look and move at once. Proximity shows stop/listen or keep walking. Audio starts only after choosing Stop and listen; Continue walking stops the selected story. The homepage preview renders scenery without story bubbles, controls or audio. Leaving the route stops playback and disposes the renderer and event listeners. For adding future assets under public/street-view and wire them in app/street-view/scene.ts.
