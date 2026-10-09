# Build Some Team Social Games

A browser-based multiplayer social game project developed for CITS3200.

The project currently includes **Sketch Recall**, a multiplayer memory and drawing game where players draw a sequence of words, complete a distraction phase, and then try to remember the original words from their drawings.

## Project Structure

```text
├── backend/            # Colyseus multiplayer server
│   ├── src/
│   └── test/
├── frontend/           # React frontend
│   ├── src/
│   └── public/
├── docs/               # Project documentation
├── .github/            # GitHub workflow configuration
├── package.json        # Workspace configuration
└── README.md
```

## Main Technologies

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Colyseus SDK
- Vitest
- React Testing Library

### Backend
- Node.js
- TypeScript
- Colyseus
- Mocha
- Colyseus Testing

## Getting Started

Node.js 22 or later is recommended.

From the root of the repository, install the project dependencies:

```bash
npm install
```

The repository uses npm workspaces for the frontend and backend.

## Running the Project

The frontend and backend need to run at the same time.

Start the backend in one terminal:

```bash
npm run dev --prefix backend
```

Start the frontend in another terminal:

```bash
npm run dev --prefix frontend
```

Open the local address shown by Vite in the frontend terminal. This is normally:

```text
http://localhost:5173
```

For multiplayer testing on one computer, multiple browser windows or tabs can be used to join the same room.

## Sketch Recall

Sketch Recall is a multiplayer memory game built around three main phases:

1. **Drawing** – players are shown a sequence of words and draw each one before the timer expires.
2. **Distraction** – players answer questions intended to interrupt their short-term memory of the words.
3. **Recall** – players use the drawings to try to remember the original words.

At the end of the game, the players' scores are shown on a multiplayer leaderboard and the completed drawings can be viewed in the final gallery.

## Multiplayer Lobby

A player can create a room and share the room code with other players.

Players joining the room can see:
- the other connected players
- who is the host
- each player's ready state
- the selected game settings

The host controls the main game settings before starting the game.

### Host Settings

The host can configure:

- **Game mode**
  - Sketch Recall
  - Sketch Recall: Anonymous Swap
- **Drawing speed**
  - Easy
  - Normal
  - Hard
- **Number of drawings**
  - 10
  - 15
  - 20
  - 25
  - 30
- **Word theme**
  - General
  - Animals
  - Food
  - Sports
  - Transport
  - Nature
- **Player-created questions**
  - Can be enabled or disabled before the game starts

The game begins once the required setup is complete and all players are ready.

## Drawing Phase

During the Drawing phase, players are shown one word at a time and must draw it before continuing to the next word.

The drawing canvas supports:

- Pencil
- Eraser
- Adjustable brush size
- Six drawing colours
- Line tool
- Rectangle tool
- Circle tool
- Fill bucket
- Undo
- Clear canvas
- Live shape previews while dragging

The drawings are saved and later used during the Recall phase.

## Distraction Phase

After drawing, players complete a distraction phase before they are allowed to recall the original words.

The distraction phase includes a server-provided question bank.

When player-created questions are enabled, players can also submit personal multiple-choice questions in the lobby. These questions can be distributed to other players during the distraction phase.

The host can disable player-created questions if they want to use only the standard distraction questions.

## Recall Phase

During Recall, players use the drawings as memory prompts and enter the word they believe was originally shown.

Recall answers are scored from **0 to 4 points** depending on how closely the answer matches the original word.

The server is responsible for multiplayer scoring and keeps the players synchronized between Recall rounds.

### Normal Recall

Players recall the words using their own saved drawings.

### Sketch Recall: Anonymous Swap

In Sketch Recall: Anonymous Swap mode, players can receive another player's drawing without being shown the artist's identity and attempt to recall the original word from it.

## Team Abilities

During multiplayer Recall, players can vote to use shared team abilities.

The current abilities include:

- **Hint**
- **Reveal**

An ability activates when enough eligible players vote for it and each ability can only be used once per game.

## Results

After the final Recall round, the game displays:

- each player's final score
- multiplayer ranking
- tied rankings where applicable
- the current player's position
- the final drawing gallery

The gallery allows players to look back at the drawings created during the game.

The host can use **Play Again** to return everyone to the lobby together and start another game.

## Testing

### Frontend Tests

Run the frontend test suite once:

```bash
npm run test:run --prefix frontend
```

Run the frontend build:

```bash
npm run build --prefix frontend
```

### Backend Tests

Run the backend test suite:

```bash
npm test --prefix backend
```

Run the backend build:

```bash
npm run build --prefix backend
```

Before merging changes into `main`, the relevant tests and builds should be run and any affected multiplayer flow should also be checked manually.

## Manual Multiplayer Testing

For a basic local multiplayer test:

1. Start the backend.
2. Start the frontend.
3. Open the game in two browser windows.
4. Create a room in the first window.
5. Join the room using the room code in the second window.
6. Complete the lobby setup.
7. Ready both players.
8. Start the game.
9. Complete Drawing, Distraction and Recall.
10. Confirm that both players reach the final leaderboard.
11. Confirm that the final gallery loads the submitted drawings.
12. Test Play Again and confirm that both players return to the lobby.

More detailed acceptance checks are documented in:

```text
docs/acceptance-tests.md
```

## Project Goal

The original project brief was to create browser-based social games for remote teams.

The games should:
- run in the browser without requiring installation
- provide multiplayer social interaction
- introduce original gameplay rather than directly copying an existing game
- keep the technical setup simple enough for players to join and play together

Sketch Recall was developed as the team's main game around these requirements.