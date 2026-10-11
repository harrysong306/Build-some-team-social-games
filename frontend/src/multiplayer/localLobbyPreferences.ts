export type LobbyPreferences = {
  playerName: string
  gameMode: string
  drawingSpeed: string
  customDrawingMin: number
  customDrawingMax: number
  drawingCount: number
  wordTheme: string
  playerQuestionsEnabled: boolean
  questionPrompt: string
  questionOptions: string[]
  correctOption: number
  questionCorrectOptions: Record<string, number>
}

const STORAGE_KEY = 'sketchRecallLobbyPreferences'

export const DEFAULT_LOBBY_PREFERENCES: LobbyPreferences = {
  playerName: '',
  gameMode: 'sketchRecall',
  drawingSpeed: 'normal',
  customDrawingMin: 6,
  customDrawingMax: 10,
  drawingCount: 25,
  wordTheme: 'general',
  playerQuestionsEnabled: true,
  questionPrompt: '',
  questionOptions: ['', '', '', ''],
  correctOption: 0,
  questionCorrectOptions: {},
}

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

export function readLobbyPreferences(): LobbyPreferences {
  if (!hasLocalStorage()) {
    return DEFAULT_LOBBY_PREFERENCES
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return DEFAULT_LOBBY_PREFERENCES
    }

    const saved = JSON.parse(raw) as Partial<LobbyPreferences>

    const questionOptions = Array.isArray(saved.questionOptions)
      ? saved.questionOptions.slice(0, 4)
      : DEFAULT_LOBBY_PREFERENCES.questionOptions

    while (questionOptions.length < 4) {
      questionOptions.push('')
    }

    return {
      ...DEFAULT_LOBBY_PREFERENCES,
      ...saved,
      questionOptions,
      correctOption:
        typeof saved.correctOption === 'number'
          ? Math.min(3, Math.max(0, Math.round(saved.correctOption)))
          : DEFAULT_LOBBY_PREFERENCES.correctOption,
      questionCorrectOptions:
        saved.questionCorrectOptions &&
        typeof saved.questionCorrectOptions === 'object'
          ? Object.fromEntries(
              Object.entries(saved.questionCorrectOptions)
                .filter(([, option]) => typeof option === 'number')
                .map(([key, option]) => [
                  key,
                  Math.min(3, Math.max(0, Math.round(option))),
                ]),
            )
          : DEFAULT_LOBBY_PREFERENCES.questionCorrectOptions,
    }
  } catch {
    return DEFAULT_LOBBY_PREFERENCES
  }
}

export function saveLobbyPreferences(
  preferences: Partial<LobbyPreferences>,
) {
  if (!hasLocalStorage()) return

  const next = {
    ...readLobbyPreferences(),
    ...preferences,
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next),
    )
  } catch {
    // Local preferences are optional; blocked storage should not affect play.
  }
}
