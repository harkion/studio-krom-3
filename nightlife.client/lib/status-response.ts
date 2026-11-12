// Static HTML can be served even when the database or React page is unavailable.
export function statusResponse(status: 300 | 503) {
  const maintenance = status === 503;
  const title = maintenance
    ? "The street is taking a break"
    : "Whose night will you explore?";
  const message = maintenance
    ? "Night Light is undergoing maintenance. Please try again in a minute."
    : "Walk towards a glowing orb to hear someone's story, or share a moment from your own night out.";
  const links = maintenance
    ? '<a href="">Try again</a>'
    : '<a href="/street-view">Explore the street</a><a href="/ShareStory">Share your story</a>';

  return new Response(
    `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title} | Night Light</title><link rel="stylesheet" href="/status.css">
    </head><body style="margin:0;background:#101820"><main class="nl-status nl-status-standalone">
    <small>Night Light · ${status}</small><h1>${title}</h1><p>${message}</p>
    <nav aria-label="Available actions">${links}</nav></main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        ...(maintenance ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
