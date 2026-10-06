import { useEffect, useState } from 'react'
import type { BuzzerState } from './useBuzzer'

type BuzzerPanelProps = {
  buzzer: BuzzerState
  mySessionId: string
  roundStarted: boolean
  // Out of lives: can watch but not buzz.
  disabled: boolean
  onBuzz: () => void
}

// Seconds left until `deadline`, updated a few times a second.
function useSecondsLeft(deadline: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return

    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [deadline])

  return deadline
    ? Math.max(0, Math.ceil((deadline - now) / 1000))
    : 0
}

/*
 * BE-21/22 (buzzer mode): the BUZZ button and
 * who is answering. Only the buzzer holder can
 * type an answer (RecallPhase checks that).
 */
function BuzzerPanel({
  buzzer,
  mySessionId,
  roundStarted,
  disabled,
  onBuzz,
}: BuzzerPanelProps) {
  const secondsLeft = useSecondsLeft(buzzer.answerDeadline)

  if (!roundStarted) return null

  const iHoldBuzzer = buzzer.holderId === mySessionId
  const canBuzz =
    !disabled &&
    buzzer.holderId === null &&
    buzzer.eligible.includes(mySessionId)

  return (
    <div className="mt-5 rounded-xl border border-amber-500/30 bg-[#211006] p-4">
      <p className="text-sm font-semibold uppercase text-amber-400">
        Buzzer
      </p>

      {buzzer.lastReason && (
        <p className="mt-2 text-sm text-red-300">
          {buzzer.lastName || 'The last player'}{' '}
          {buzzer.lastReason === 'wrong'
            ? 'got it wrong.'
            : 'ran out of time.'}{' '}
          Buzzing is open again!
        </p>
      )}

      {iHoldBuzzer ? (
        <p className="mt-2 font-bold text-green-400">
          🔔 You buzzed! Answer within {secondsLeft}s
        </p>
      ) : buzzer.holderId ? (
        <p className="mt-2 font-semibold text-amber-200">
          🔔 {buzzer.holderName} buzzed and is answering… ({secondsLeft}s)
        </p>
      ) : canBuzz ? (
        <button
          type="button"
          onClick={onBuzz}
          className="mt-3 w-full rounded-xl bg-red-500 py-4 text-xl font-black text-white transition hover:brightness-110"
        >
          🔔 BUZZ!
        </button>
      ) : (
        <p className="mt-2 text-sm text-white/50">
          {disabled
            ? "You're out of lives, so you can't buzz."
            : 'You already had your turn on this drawing.'}
        </p>
      )}
    </div>
  )
}

export default BuzzerPanel
