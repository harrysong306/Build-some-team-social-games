export type LobbyPreferences = {
  playerName: string
  gameMode: string
  drawingSpeed: string
  customDrawingMin: number
  customDrawingMax: number
  drawingCount: number
  wordTheme: string
  playerQuestionsEnabled: boolean
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

    return {
      ...DEFAULT_LOBBY_PREFERENCES,
      ...saved,
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
