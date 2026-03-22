function AboutSection() {
  const graduationDate = new Date("May 11 2026")
  const now = new Date()
  const daysUntilGraduation = Math.ceil(
    (graduationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const hasGraduated = now >= graduationDate

  return (
    <div className="w-full max-w-3xl">
      <div className="flex flex-col gap-8">
        <div className="text-xl">
          <h1>
            <span>Jaith Darrah</span>. Software engineer with an eye for
            details. {/** Add some animated eye here later */}
          </h1>
          <h2>
            Currently engineering part time at{" "}
            <span className="italic">Mangrove</span>.
          </h2>
        </div>
        <div>
          <p>
            {hasGraduated
              ? "Chicago area local who graduated with a Bachelor of Science in Computer Science from Arizona State University on May 11, 2026."
              : `Chicago area local graduating with a Bachelor of Science in Computer Science from Arizona State University in ${daysUntilGraduation} days on May 11, 2026.`}{" "}
            {/** expand ASU to Arizona State University on hover */}
            Clash Royale, chess, code, and speed typing nerd.
            {/** Links or some kind of interactivity like chess puzzles */}
          </p>
        </div>
      </div>
    </div>
  )
}

export { AboutSection }
