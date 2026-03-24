import Link from "next/link"
import {
  FaNoteSticky,
  FaKeyboard,
  FaChessKnight,
  FaCamera,
} from "react-icons/fa6"

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
  },
  {
    name: "Chess Puzzles",
    description: "Solve some chess puzzles.",
    href: "/fun/chess-puzzles",
    icon: <FaChessKnight className="text-4xl text-green-500" />,
    bgClass: "bg-green-500/10",
    bgImage: "/brilliant.png",
  },
  {
    name: "Photo Gallery",
    description: "A collection of photos I've taken.",
    href: "/fun/photo-gallery",
    icon: <FaCamera className="text-4xl text-purple-500" />,
    bgClass: "bg-purple-500/10",
  },
]

export default function FunPage() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <h1>Fun</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {funItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group/card flex flex-col overflow-hidden rounded-[14px] bg-muted no-underline transition-opacity duration-200 ease-linear hover:opacity-80"
          >
            <div className="p-2">
              <div
                className={`flex h-28 items-center justify-center rounded-md ${item.bgClass}`}
              >
                {item.icon}
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">
                {item.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
