const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()

const levenshteinDistance = (
  left: string,
  right: string,
) => {
  const rows = Array.from(
    { length: left.length + 1 },
    () => Array(right.length + 1).fill(0),
  )

  for (let i = 0; i <= left.length; i++) {
    rows[i][0] = i
  }

  for (let j = 0; j <= right.length; j++) {
    rows[0][j] = j
  }

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const substitutionCost =
        left[i - 1] === right[j - 1] ? 0 : 1

      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + substitutionCost,
      )
    }
  }

  return rows[left.length][right.length]
}

export const scoreGuess = (
  guess: string,
  target: string,
) => {
  const normalizedGuess = normalize(guess)
  const normalizedTarget = normalize(target)

  if (!normalizedGuess && !normalizedTarget) {
    return 4
  }

  if (
    !normalizedGuess ||
    !normalizedTarget
  ) {
    return 0
  }

  if (
    normalizedGuess === normalizedTarget
  ) {
    return 4
  }

  const maxLength = Math.max(
    normalizedGuess.length,
    normalizedTarget.length,
  )

  if (maxLength === 0) {
    return 4
  }

  const distance = levenshteinDistance(
    normalizedGuess,
    normalizedTarget,
  )
  const similarity =
    1 - distance / maxLength

  let score = Math.round(similarity * 4)

  if (
    normalizedGuess.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedGuess)
  ) {
    score = Math.max(score, 3)
  }

  return Math.max(0, Math.min(4, score))
}
