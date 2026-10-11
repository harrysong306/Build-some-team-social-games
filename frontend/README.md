# Frontend

This folder contains the React frontend for Sketch Recall.

The frontend handles the game screens, room creation/joining, lobby controls, drawing tools, distraction questions, Recall and the final results screens.

## Tech

- React
- TypeScript
- Vite
- Tailwind CSS
- Colyseus SDK
- Vitest
- React Testing Library

## Running the Frontend

The backend should also be running for multiplayer features to work.

From the project root:

```bash
npm run dev --prefix frontend
```

Or from inside this folder:

```bash
npm run dev
```

Vite will print the local address in the terminal, normally:

```text
http://localhost:5173
```

## Main Areas

```text
src/
├── components/          # Shared UI components
├── multiplayer/         # Create/join room and lobby code
├── sketch-recall/       # Main Sketch Recall game screens
├── App.tsx              # Main frontend navigation
└── main.tsx             # React entry point
```

The main application starts at the game collection screen. Players can then choose Sketch Recall and either create a room or join an existing room. The room and game screens are handled from there.

## Sketch Recall Screens

The main Sketch Recall flow includes:

1. Instructions
2. Drawing
3. Distraction
4. Recall
5. Results

Multiplayer games also include the lobby, final leaderboard and drawing gallery.

## Testing

Run the frontend tests once:

```bash
npm run test:run
```

Run tests in watch mode:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```

Run the linter:

```bash
npm run lint
```

Before merging frontend changes, the affected tests should be run along with the production build.

## Multiplayer Testing

For a basic local multiplayer check:

1. Run the backend and frontend.
2. Open the frontend in two browser windows.
3. Create a room in one window.
4. Join with the room code in the second window.
5. Check that both players see the same lobby state.
6. Ready both players and start the game.
7. Continue through the main game flow.

The more detailed manual checks are in:

```text
../docs/acceptance-tests.md
```