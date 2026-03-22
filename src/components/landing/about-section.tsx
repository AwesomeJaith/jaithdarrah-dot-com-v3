function AboutSection() {
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
            Chicago area local graduating with a B.S. in Computer Science from
            ASU {/** expand to Arizona State University on hover */}
            in xxx days on May 11, 2026. Clash Royale, Chess, Code, and speed
            typing nerd.
            {/** Links or some kind of interactivity like chess puzzles */}
          </p>
        </div>
      </div>
    </div>
  )
}

export { AboutSection }
