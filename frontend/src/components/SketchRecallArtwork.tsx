function SketchRecallArtwork() {
  return (
    <div className="relative h-full min-h-[360px] overflow-hidden bg-gradient-to-br from-[#3a1c08] via-[#8b470f] to-[#261005]">

      {/* background glow */}
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 blur-3xl" />

      {/* small decorative cards */}
      <div className="absolute left-10 top-24 h-20 w-16 -rotate-12 rounded-lg border border-amber-300/25 bg-amber-100/5" />
      <div className="absolute bottom-10 right-8 h-16 w-16 rotate-12 rounded-lg border border-amber-300/20 bg-amber-100/5" />

      {/* notebook */}
      <div className="absolute left-1/2 top-1/2 w-[235px] -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-xl bg-[#f4dda3] p-7 shadow-2xl">

        {/* notebook rings */}
        <div className="absolute -left-3 top-6 flex h-[80%] flex-col justify-around">
          {[1, 2, 3, 4, 5, 6].map((ring) => (
            <div
              key={ring}
              className="h-4 w-6 rounded-full border-2 border-[#4c2a12]"
            />
          ))}
        </div>

        {/* paper lines */}
        <div className="absolute inset-0 opacity-20">
          {[35, 55, 75, 95, 115, 135, 155, 175].map((top) => (
            <div
              key={top}
              className="absolute left-5 right-5 h-px bg-[#69441f]"
              style={{ top }}
            />
          ))}
        </div>

        {/* stick figure */}
        <svg
          viewBox="0 0 150 180"
          className="relative h-[220px] w-full text-[#39200e]"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        >
          <circle cx="75" cy="40" r="20" />
          <path d="M75 60v60" />
          <path d="M75 78 35 100" />
          <path d="M75 78 115 100" />
          <path d="M75 120 45 165" />
          <path d="M75 120 105 165" />
        </svg>
      </div>

      {/* pencil */}
      <div className="absolute bottom-16 right-12 h-52 w-7 rotate-[35deg] rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-600 shadow-lg">
        <div className="absolute -top-5 h-7 w-7 rounded-t-full bg-[#e5a6a6]" />
        <div className="absolute -bottom-8 h-10 w-7 bg-[#d8b078] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
      </div>
    </div>
  )
}

export default SketchRecallArtwork