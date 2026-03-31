import type { Metadata } from "next"
import Link from "next/link"
import {
  FaNoteSticky,
  FaKeyboard,
  FaChessKnight,
  FaCamera,
} from "react-icons/fa6"

export const metadata: Metadata = {
  title: "Fun",
  description:
    "Fun interactive experiences: sticker wall, typing race, chess puzzles, and photo gallery.",
}

const funItems = [
  {
    name: "Sticker Wall",
    description: "A wall of fun stickers and doodles.",
    href: "/fun/sticker-wall",
    icon: <FaNoteSticky className="text-4xl text-yellow-500" />,
    bgClass: "bg-yellow-500/10",
  },
  {
    name: "Typing Race",
    description: "Can you type faster than me?",
    href: "/fun/typing-race",
    icon: <FaKeyboard className="text-4xl text-blue-500" />,
    bgClass: "bg-blue-500/10",
    comingSoon: true,
  },
  {
    name: "Chess Puzzles",
    description: "Solve some chess puzzles.",
    href: "/fun/chess-puzzles",
    icon: <FaChessKnight className="text-4xl text-green-500" />,
    bgClass: "bg-green-500/10",
    bgImage: "/brilliant.png",
    comingSoon: true,
  },
  {
    name: "Photo Gallery",
    description: "A collection of photos I've taken.",
    href: "/fun/photo-gallery",
    icon: <FaCamera className="text-4xl text-purple-500" />,
    bgClass: "bg-purple-500/10",
    comingSoon: true,
  },
]

export default function FunPage() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <h1>Fun</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {funItems.map((item) => {
          const Card = (
            <div
              key={item.name}
              className={`group/card flex flex-col overflow-hidden rounded-[14px] bg-muted no-underline transition-opacity duration-200 ease-linear ${item.comingSoon ? "cursor-default" : "hover:opacity-80"}`}
            >
              <div className="relative p-2">
                <div
                  className={`flex h-28 items-center justify-center rounded-md ${item.bgClass}`}
                >
                  {item.icon}
                </div>
                {item.comingSoon && (
                  <span className="absolute top-4 right-4 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming Soon
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground">
                  {item.description}
                </span>
              </div>
            </div>
          )

          if (item.comingSoon) return Card

          return (
            <Link key={item.name} href={item.href} className="no-underline">
              {Card}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
