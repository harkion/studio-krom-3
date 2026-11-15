import Link from "next/link";

export default function StatusPage({ retry }: { retry?: () => void }) {
  return (
    <main className="nl-status">
      <link rel="stylesheet" href="/status.css" />
      {/* Reuse the crescent from our logo as the middle zero. */}
      <div className="nl-status-code" role="img" aria-label={`Error ${retry ? "500" : "404"}`}>
        <span aria-hidden="true">{retry ? "5" : "4"}</span>
        <span className="nl-status-moon" aria-hidden="true" />
        <span aria-hidden="true">{retry ? "0" : "4"}</span>
      </div>
      <h1>{retry ? "This page couldn't load" : "This street ends here"}</h1>
      <p>
        {retry
          ? "We couldn't display this page. You can try loading it again."
          : "We couldn't find a page at this address. Step back onto the street to hear stories from Eindhoven's nights."}
      </p>
      <nav aria-label="Page recovery">
        {retry ? <button onClick={retry}>Try again</button> : <Link href="/street-view">Back to Street View</Link>}
        <Link href="/">Night Light home</Link>
      </nav>
    </main>
  );
}
