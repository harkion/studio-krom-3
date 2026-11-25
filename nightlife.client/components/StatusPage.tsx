import Link from "next/link";

export default function StatusPage({ retry, code = retry ? 500 : 404, title, message }: {
  retry?: () => void;
  code?: 404 | 500 | 503;
  title?: string;
  message?: string;
}) {
  return (
    <main className="nl-status">
      <link rel="stylesheet" href="/status.css" />
      {/* Reuse the crescent from our logo as the middle zero. */}
      <div className="nl-status-code" role="img" aria-label={`Error ${code}`}>
        <span aria-hidden="true">{String(code)[0]}</span>
        <span className="nl-status-moon" aria-hidden="true" />
        <span aria-hidden="true">{String(code)[2]}</span>
      </div>
      <h1>{title ?? (retry ? "This page couldn't load" : "This street ends here")}</h1>
      <p>
        {message ?? (retry
          ? "We couldn't display this page. You can try loading it again."
          : "We couldn't find a page at this address. Step back onto the street to hear stories from Eindhoven's nights.")}
      </p>
      <nav aria-label="Page recovery">
        {retry ? <button onClick={retry}>Try again</button> : <Link href="/street-view">Back to Street View</Link>}
        <Link href="/">Night Light home</Link>
      </nav>
    </main>
  );
}
