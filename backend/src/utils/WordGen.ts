import {
  wordPacks,
  type WordPackTheme,
} from './sketchRecallWords.js'


const shuffle = <T,>(items: readonly T[]) => {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[result[i], result[j]] = [
      result[j],
      result[i],
    ]
  }

  return result
}


const generateGameWords = (
  wordCount: number = 25,
  theme: WordPackTheme = 'general',
) => {
  const pack = wordPacks[theme]

  const selectedGroups =
    shuffle<readonly string[]>(pack.similarWordGroups).slice(0, 3)

  const similarWords = selectedGroups.flat()

  const selectedGeneralWords =
    shuffle<string>(pack.generalWords).slice(
      0,
      wordCount - similarWords.length,
    )

  return shuffle([
    ...similarWords,
    ...selectedGeneralWords,
  ])
}


export { generateGameWords }