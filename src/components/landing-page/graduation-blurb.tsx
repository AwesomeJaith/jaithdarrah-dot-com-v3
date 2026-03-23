"use client"

function GraduationBlurb() {
  const graduationDate = new Date("May 11 2026")
  const now = new Date()
  const daysUntilGraduation = Math.ceil(
    (graduationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const hasGraduated = now >= graduationDate

  return (
    <>
      {hasGraduated
        ? "Chicago area local who graduated with a Bachelor of Science in Computer Science from Arizona State University on May 11, 2026."
        : `Chicago area local graduating with a Bachelor of Science in Computer Science from Arizona State University in ${daysUntilGraduation} days on May 11, 2026.`}
    </>
  )
}

export { GraduationBlurb }
