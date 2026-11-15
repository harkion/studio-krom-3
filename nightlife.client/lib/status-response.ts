export const statusCodes = [300, 400, 401, 404, 500, 501, 503, 505] as const;
export type StatusCode = typeof statusCodes[number];
export function isStatusCode(value: string): boolean {
  return statusCodes.some(code => String(code) === value);
}

const messages: Record<StatusCode, [string, string]> = {
  300: ["Whose night will you explore?", "Explore the street or share a moment from your own night out."],
  400: ["This request lost its way", "Something in the request could not be understood. Return home and try again."],
  401: ["Sign in to continue", "This part of Night Light requires you to sign in."],
  404: ["This street ends here", "We couldn't find a page at this address. Head home to find your way back."],
  500: ["This page couldn't load", "Something went wrong on our side. Please try again shortly."],
  501: ["This path isn't ready", "The server cannot carry out this request. You can continue from home."],
  503: ["The street is taking a break", "Night Light is temporarily unavailable. Please try again in a minute."],
  505: ["We couldn't connect this way", "The server doesn't support the HTTP version used for this request."],
};

// Static HTML can be served even when the database or React page is unavailable.
export function statusResponse(status: StatusCode) {
  const maintenance = status === 503;
  const [title, message] = messages[status];
  const links = status === 300
    ? '<a href="/street-view">Explore the street</a><a href="/ShareStory">Share your story</a>'
    : maintenance || status === 500
      ? '<a href="">Try again</a><a href="/">Night Light home</a>'
      : '<a href="/">Night Light home</a>';


  return new Response(
    `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title} | Night Light</title><link rel="stylesheet" href="/status.css">
    </head><body style="margin:0;background:#101820"><main class="nl-status nl-status-standalone">
    <div class="nl-status-code" role="img" aria-label="${status === 300 ? "Status" : "Error"} ${status}"><span aria-hidden="true">${String(status)[0]}</span><span class="nl-status-moon" aria-hidden="true"></span><span aria-hidden="true">${String(status)[2]}</span></div><h1>${title}</h1><p>${message}</p>
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
