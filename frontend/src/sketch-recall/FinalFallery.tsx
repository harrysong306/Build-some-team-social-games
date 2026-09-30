import { useEffect, useState, type ReactNode } from 'react'
import type { Room } from '@colyseus/sdk'

type FinalGalleryProps = {
  room: Room
  words: readonly string[]
}

type GalleryEntry = {
  sessionId: string
  index: number
}

type GalleryImage = GalleryEntry & {
  image: string
}

const entryKey = (sessionId: string, index: number) =>
  `${sessionId}:${index}`

function FinalGallery({ room, words }: FinalGalleryProps) {
  // null until the server sends the manifest.
  const [entries, setEntries] =
    useState<GalleryEntry[] | null>(null)

  const [images, setImages] =
    useState<Record<string, string>>({})

  /*
   * The server broadcasts the manifest when
   * the last recall round ends, which is
   * usually before this screen mounts, so
   * ask for it again here. Images are then
   * pulled one at a time to stay under the
   * websocket payload limit.
   */
  useEffect(() => {
    // Some rooms (e.g. test doubles) can't
    // receive messages; show the loading state.
    if (typeof room.onMessage !== 'function') return

    const removeManifestListener =
      room.onMessage(
        'finalGallery',
        (message: { entries: GalleryEntry[] }) => {
          setEntries(message.entries)

          message.entries.forEach((entry) => {
            room.send('requestGalleryImage', entry)
          })
        },
      )

    const removeImageListener =
      room.onMessage(
        'galleryImage',
        (message: GalleryImage) => {
          setImages((current) => ({
            ...current,
            [entryKey(message.sessionId, message.index)]:
              `data:image/png;base64,${message.image}`,
          }))
        },
      )

    room.send('requestFinalGallery', {})

    return () => {
      removeManifestListener?.()
      removeImageListener?.()
    }
  }, [room])

  const playerName = (sessionId: string) => {
    const name =
      room.state?.players?.get(sessionId)?.name ?? 'Player'

    return sessionId === room.sessionId
      ? `${name} (you)`
      : name
  }

  if (entries === null) {
    return (
      <GalleryShell>
        <p className="text-sm text-white/50">
          Loading drawings…
        </p>
      </GalleryShell>
    )
  }

  if (entries.length === 0) {
    return (
      <GalleryShell>
        <p className="text-sm text-white/50">
          No drawings were submitted this game.
        </p>
      </GalleryShell>
    )
  }

  // Group drawings by player, keeping the
  // order the server sent them in.
  const players: string[] = []
  const byPlayer: Record<string, GalleryEntry[]> = {}

  entries.forEach((entry) => {
    if (!byPlayer[entry.sessionId]) {
      byPlayer[entry.sessionId] = []
      players.push(entry.sessionId)
    }

    byPlayer[entry.sessionId].push(entry)
  })

  return (
    <GalleryShell>
      <h2 className="text-xl font-bold">
        Drawing Gallery
      </h2>

      <p className="mt-1 text-sm text-white/50">
        Everyone's drawings from this game.
      </p>

      {players.map((sessionId) => (
        <div
          key={sessionId}
          className="mt-6"
        >
          <h3 className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            {playerName(sessionId)}
          </h3>

          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {byPlayer[sessionId].map(({ index }) => {
              const image =
                images[entryKey(sessionId, index)]
              const word = words[index] ?? `Drawing ${index + 1}`

              return (
                <li
                  key={index}
                  className="overflow-hidden rounded-xl border border-amber-500/20 bg-[#211006]"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={`${playerName(sessionId)}'s drawing of ${word}`}
                      className="aspect-square w-full bg-white object-contain"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center text-xs text-white/40">
                      Loading…
                    </div>
                  )}

                  <p className="px-3 py-2 text-sm font-semibold">
                    {word}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </GalleryShell>
  )
}

// Matches the results screen above it.
function GalleryShell({ children }: { children: ReactNode }) {
  return (
    <section className="bg-[#0d0704] px-6 pb-12 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-6 text-left">
        {children}
      </div>
    </section>
  )
}

export default FinalGallery
