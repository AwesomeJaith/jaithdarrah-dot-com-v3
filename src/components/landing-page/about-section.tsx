import { Suspense } from "react"
import { EyeIcon } from "./eye-icon"
import { GraduationBlurb } from "./graduation-blurb"

function AboutSection() {
  return (
    <div className="w-full max-w-3xl text-muted-foreground">
      <div className="flex flex-col gap-8">
        <div className="text-xl">
          <h1>
            <span className="text-primary">Jaith Darrah</span>. Software
            engineer with an <EyeIcon />{" "}
            for details.
          </h1>
          <h2>
            Currently engineering part time at{" "}
            <span className="text-primary italic underline decoration-muted-foreground decoration-wavy underline-offset-6 hover:decoration-primary">
              <a
                href="https://mangrove.ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mangrove
              </a>
            </span>
            .
          </h2>
        </div>
        <div>
          <p>
            <Suspense>
              <GraduationBlurb />
            </Suspense>{" "}
            Clash Royale, chess, code, and speed typing nerd.
            {/** Links or some kind of interactivity like chess puzzles */}
          </p>
        </div>
      </div>
    </div>
  )
}

export { AboutSection }
