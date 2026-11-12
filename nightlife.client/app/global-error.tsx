"use client";

import ErrorPage from "./error";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <head><title>Night Light | Something went wrong</title></head>
      <body style={{ margin: 0, background: "#101820" }}><ErrorPage retry={retry} /></body>
    </html>
  );
}
