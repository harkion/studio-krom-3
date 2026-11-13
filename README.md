# Night Light

Developed for Studio Krom’s *Who Owns the Night?* brief, Night Light explores the positive side of nightlife in Eindhoven through personal stories. Visitors walk through a fictional 3D street that connects a station, a bar street and an alley. Along the way, they can pause to hear someone’s experience or share a moment of kindness from their own night out.

[Explore Night Light](https://studio-krom-3.vercel.app/)

## Exploring the street

Enter **Street View** from the homepage. On desktop, use the arrow keys or WASD to walk. On mobile, swipe to look around and drag on the lower part of the screen to move. As you approach a story bubble, choose **Stop and listen** to hear an available recording or **Keep walking** to explore further. The street loops continuously, so you can revisit each area at your own pace.

Visitors can use **Share your story** (`/ShareStory`) to contribute an experience. **End Loop & Feedback** opens a short survey about how they felt after exploring the street.

## Reviewing and publishing stories

Submissions enter a review queue before they appear in the street. Sign in at `/Admin/login`, open a pending submission in `/Admin` and review it for publication. Once approved, the story becomes available in Street View.

During review, an administrator can attach an existing recording or select a narrator. AI narration requires the contributor’s explicit permission and a configured ElevenLabs key. Keep the review page open until generation finishes. The recording is saved in Supabase Storage for subsequent playback.

## Technical overview

The website uses Next.js and TypeScript. Three.js renders the street, Supabase manages stories, administrator sign-in, survey responses and audio storage, and Vercel hosts the website.

## Run the website locally

From the repository root, use Node.js 22.18 or newer and npm. The Next.js app runs from `nightlife.client`. The separate ASP.NET project in `NightLife.Server` is optional for the website flow described here.

```sh
cd nightlife.client
npm ci
```

Create `.env.local` **inside that folder**, next to its `package.json`. Ask the project maintainer for the Supabase URL and public anonymous key.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PROJECT_ANON_KEY
```

Run `npm run dev` and open the local URL printed in the terminal, usually [localhost:3000](http://localhost:3000). Restart the server after changing environment variables. Keep the local environment file out of Git. For the admin narration feature, follow the [ElevenLabs and storage setup guide](nightlife.client/docs/automatic-narration.md).

## Project file guide

The paths below start in [nightlife.client](nightlife.client/).

| Area | Files and responsibilities |
| --- | --- |
| Homepage content, preview or appearance | [Homepage](nightlife.client/app/page.tsx) and [home styles](nightlife.client/app/home.css) |
| Site navigation or shared styling | [Navbar](nightlife.client/components/Navbar.tsx), [layout](nightlife.client/app/layout.tsx) and [global styles](nightlife.client/app/globals.css) |
| Buildings, movement, story bubbles or audio playback | [Three.js scene](nightlife.client/app/street-view/scene.ts). The homepage also uses this scene in preview mode. |
| Where each area begins and how the street repeats | [Loop path](nightlife.client/app/street-view/loop-path.ts). One cycle spans 240 metres, with 80 metres per area. |
| Street controls, feedback button or overlay styles | [Street page](nightlife.client/app/street-view/page.tsx) and [street styles](nightlife.client/app/street-view/street.css) |
| Which stories appear in the street | [Street data query](nightlife.client/app/street-view/actions.ts) loads approved rows from Supabase. For one story’s position, edit its X and Z in the admin interface. |
| Submission fields and what gets saved | [Share Story form](nightlife.client/app/ShareStory/page.tsx). It inserts directly into the Supabase `stories` table. |
| End-of-loop survey questions and saving answers | [CourageSurvey](nightlife.client/components/CourageSurvey.tsx), which writes to `survey_responses` |
| Reviewing, editing or creating stories | [Admin pages](nightlife.client/app/Admin/) and [admin actions](nightlife.client/app/Admin/actions.ts) |
| Voice selection and speech generation | [Narration controls](nightlife.client/app/Admin/NarrationControls.tsx), [narration API](nightlife.client/app/api/admin/stories/%5Bid%5D/narration/route.ts) and [generation logic](nightlife.client/lib/narration.ts) |
| Supabase connection | [Supabase client](nightlife.client/lib/supabase.ts) |

The old `/map` URL redirects to the street experience. The SQLite code in [lib/stories.ts](nightlife.client/lib/stories.ts) belongs to the older API routes. For more on the 3D controls and assets, see the [street view guide](nightlife.client/STREET-VIEW.md).

## Testing and deployment

Run the following commands from `nightlife.client`.

```sh
npm run lint
npm run typecheck
node --experimental-strip-types --test tests/narration.test.mjs
npm run build
npm start
```

The narration tests use mock services. The last two commands build and serve the production version locally.

For Vercel, use `nightlife.client` as the project root and the Next.js preset. Set the Supabase variables in each deployment environment you use. If it generates narration, add the server-side settings from the narration guide as well. Redeploy after changing variables. For the team’s production site, check that the deployment uses the intended commit from `main`.

## Troubleshooting

If the street loads without story bubbles, check that the configured Supabase project contains approved stories and permits reading them. If npm reports a missing `package.json`, check that your terminal is in `nightlife.client`.
