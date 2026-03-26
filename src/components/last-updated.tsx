async function getLastCommitDate(): Promise<string | null> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/AwesomeJaith/jaithdarrah-dot-com-v3/commits?per_page=1",
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const commits = await res.json()
    return commits[0]?.commit?.committer?.date ?? null
  } catch {
    return null
  }
}

async function LastUpdated() {
  const dateStr = await getLastCommitDate()
  if (!dateStr) return null

  const date = new Date(dateStr)
  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <a
      href="https://github.com/AwesomeJaith/jaithdarrah-dot-com-v3"
      target="_blank"
      rel="noopener noreferrer"
      className="link-underline text-sm text-muted-foreground"
    >
      Last updated {formatted}
    </a>
  )
}

export { LastUpdated }
