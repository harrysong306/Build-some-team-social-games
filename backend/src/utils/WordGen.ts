import {
  generalWords,
  similarWordGroups,
} from './sketchRecallWords.js'


const shuffle = <T,>(items: T[]) => {
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


const generateGameWords = () => {
  const selectedGroups =
    shuffle(similarWordGroups).slice(0, 3)

  const similarWords = selectedGroups.flat()

  const selectedGeneralWords =
    shuffle(generalWords).slice(
      0,
      25 - similarWords.length,
    )

  return shuffle([
    ...similarWords,
    ...selectedGeneralWords,
  ])
}


// const [gameWords, setGameWords] =
//     useState<string[]>(() => generateGameWords())



export {generateGameWords};