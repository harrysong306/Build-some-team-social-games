function Logo() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400 bg-[#211006]">
      <svg
        viewBox="0 0 48 48"
        className="h-8 w-8 text-amber-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M24 4 40 13v22L24 44 8 35V13L24 4Z" />
        <path d="M16 16 24 12l8 4-8 4-8-4Z" />
        <path d="M16 16v10l8 5 8-5V16" />
        <circle cx="20" cy="22" r="1.5" fill="currentColor" />
        <circle cx="28" cy="24" r="1.5" fill="currentColor" />
      </svg>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-amber-500/30 bg-[#0d0704]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        <div className="flex items-center gap-3">
          <Logo />

          <span className="text-lg font-extrabold tracking-wide text-white">
            TEAM 31 <span className="text-amber-400">GAMES</span>
          </span>
        </div>

        <nav className="hidden h-full items-center md:flex">
          <button className="relative h-full px-8 font-semibold text-amber-300">
            Games

            <span className="absolute bottom-0 left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-t bg-amber-400" />
          </button>
        </nav>

        <button
          type="button"
          className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 font-bold text-black transition hover:brightness-110"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
          >
            <circle cx="9" cy="8" r="3" />
            <circle cx="16" cy="9" r="2.5" />
            <path d="M3 18c0-3 2.7-5 6-5s6 2 6 5v1H3z" />
          </svg>

          JOIN GAME
          <span>→</span>
        </button>

      </div>
    </header>
  )
}

export default Header