# Backend

This folder contains the Colyseus server used by Sketch Recall.

The backend is responsible for the shared multiplayer room state, lobby settings, game synchronization, Recall scoring, distraction questions, drawing uploads and other server-controlled multiplayer behaviour.

## Tech

- Node.js
- TypeScript
- Colyseus
- Mocha
- Colyseus Testing

## Running the Backend

Node.js 22 or later is recommended for the project.

From the project root:

```bash
npm run dev --prefix backend
```

Or from inside this folder:

```bash
npm run dev
```

The Colyseus server runs on port `2567` by default.

## Main Structure

```text
src/
├── index.ts                 # Starts the Colyseus server
├── app.config.ts            # Server and room configuration
├── rooms/
│   ├── LobbyRoom.ts         # Main multiplayer room logic
│   └── schema/              # Shared Colyseus room state
└── utils/                   # Game data and helper functions

test/
└── TestClient.test.ts       # Backend multiplayer tests
```

## LobbyRoom

`LobbyRoom` contains most of the current multiplayer game logic.

It handles areas such as:

- players joining and leaving
- host assignment
- player ready state
- lobby settings
- player-created questions
- starting games
- distraction questions
- Recall rounds
- multiplayer scoring
- drawing uploads
- final gallery data
- Anonymous Recall
- team abilities
- returning players to the lobby after a game

## Server Configuration

The server is configured in:

```text
src/app.config.ts
```

The main room registered by the server is:

```text
LobbyRoom
```

The WebSocket transport also allows larger messages so drawing data can be sent during multiplayer games.

The development server includes the Colyseus playground. A Colyseus monitor route is also configured at:

```text
/monitor
```

## Testing

Run the backend tests:

```bash
npm test
```

Run the TypeScript production build:

```bash
npm run build
```

The backend tests use Mocha together with Colyseus testing utilities to create rooms and test multiplayer behaviour.

## Useful Commands

Development server:

```bash
npm run dev
```

Tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Load test:

```bash
npm run loadtest
```

## Manual Multiplayer Testing

For full game testing, run this backend together with the frontend.

Two browser windows can be used to create two clients and test:

- joining the same room
- lobby synchronization
- ready/start behaviour
- game settings
- Drawing to Distraction to Recall flow
- scoring and results
- Play Again

See the main acceptance test document for the full manual test cases:

```text
../docs/acceptance-tests.md
```