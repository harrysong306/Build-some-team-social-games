# Sketch Recall Acceptance Tests

This document contains the main acceptance tests for Sketch Recall. These tests are used to check that the main multiplayer and gameplay features work correctly before the final release.

## Test Setup

Run the backend:

```bash
npm run dev --prefix backend
```

Run the frontend in a separate terminal:

```bash
npm run dev --prefix frontend
```

Open the address shown by Vite, normally:

```text
http://localhost:5173
```

For multiplayer tests, use two browser windows or tabs and connect both players to the same room.

---

## AT-01 - Create and Join a Room

### Steps

1. Open the application in the first browser window.
2. Create a multiplayer room.
3. Copy the room code.
4. Open the application in a second browser window.
5. Enter a different player name and the room code.
6. Join the room.

### Expected Result

- Both players enter the same lobby.
- Both players are shown in the player list.
- One player is identified as the host.
- Each player's ready status is visible.

---

## AT-02 - Lobby Settings

### Steps

1. Create a room with two players.
2. As the host, change the game mode.
3. Change the drawing speed.
4. Change the number of drawings.
5. Change the word theme.
6. Enable and disable player-created questions.

### Expected Result

- Only the host can change the game settings.
- The second player sees the selected settings.
- The available game modes are:
  - Sketch Recall
  - Sketch Recall: Anonymous Swap
- Drawing speed can be set to Easy, Normal or Hard.
- Drawing count can be set to 10, 15, 20, 25 or 30.
- The available word themes are General, Animals, Food, Sports, Transport and Nature.
- Player-created questions can be enabled or disabled.

---

## AT-03 - Player Questions Disabled

### Steps

1. Create a multiplayer room.
2. Disable player-created questions.
3. Have both players select Ready.

### Expected Result

- Players are not required to create personal questions.
- Both players can select Ready immediately.
- The host can start the game once everyone is ready.

---

## AT-04 - Player Questions Enabled

### Steps

1. Enable player-created questions.
2. Try to select Ready before creating any questions.
3. Create a question with four answer options and select the correct answer.
4. Create a second question.
5. Select Ready.

### Expected Result

- Players must create two questions before they can ready up.
- Each question requires a prompt, four options and one correct option.
- The lobby shows the number of questions submitted.
- After two questions have been submitted, the player can select Ready.
- Questions can be changed before the player is ready.

---

## AT-05 - Starting the Game

### Steps

1. Create a room with two players.
2. Have only one player select Ready.
3. Check the host's Start Game button.
4. Have the second player select Ready.
5. Start the game.

### Expected Result

- The game cannot start while a player is not ready.
- Once all players are ready, the host can start the game.
- Both players move into the game.

---

## AT-06 - Drawing Phase

### Steps

1. Start a Sketch Recall game.
2. Continue from the instruction screen.
3. Draw using the Pencil tool.
4. Change the brush size.
5. Select another drawing colour.
6. Use the Eraser.
7. Save the drawing and continue.

### Expected Result

- The current word is shown to the player.
- The Pencil draws correctly.
- The selected brush size is applied.
- The selected colour is applied.
- The Eraser removes drawing content.
- Saving the drawing moves the player to the next word.

---

## AT-07 - Shape Tools

### Steps

1. Select the Line tool.
2. Drag across the canvas and release.
3. Select the Rectangle tool and draw a rectangle.
4. Select the Circle tool and draw a circle.

### Expected Result

- A preview is visible while each shape is being drawn.
- The shape is added to the canvas when the pointer is released.
- Shapes use the currently selected drawing colour.

---

## AT-08 - Fill, Undo and Clear

### Steps

1. Draw a closed shape.
2. Select the Fill tool.
3. Fill an area inside the shape.
4. Add another drawing change.
5. Select Undo.
6. Select Clear.
7. Use Undo again.

### Expected Result

- Fill changes the connected area to the selected colour.
- Undo restores the previous drawing state.
- Clear removes the current drawing.
- Recent canvas changes can be restored using Undo.

---

## AT-09 - Drawing to Distraction

### Steps

1. Complete all drawings in the round.
2. Save the final drawing.

### Expected Result

- The Drawing phase finishes.
- The Distraction phase starts.
- The player's saved drawings are kept for the Recall phase.

---

## AT-10 - Distraction Phase

### Steps

1. Enter the Distraction phase.
2. Answer the displayed multiple-choice questions.
3. Continue answering questions until the required distraction activity is completed.

### Expected Result

- Questions and answer options are displayed correctly.
- Answers are processed correctly.
- The player can continue through the distraction questions.
- After completing the required activity, the player moves to Recall.

---

## AT-11 - Player-Created Distraction Questions

### Precondition

Player-created questions are enabled and both players submitted their questions in the lobby.

### Steps

1. Start the game.
2. Complete the Drawing phase.
3. Continue through the Distraction phase.
4. Answer any player-created questions that appear.

### Expected Result

- Player-created questions can appear during the Distraction phase.
- A player is not given their own question.
- Answers are checked correctly.
- Player-created questions work together with the normal distraction questions.

---

## AT-12 - Normal Recall

### Steps

1. Reach the Recall phase in normal Sketch Recall mode.
2. View the drawing for the current round.
3. Enter an answer.
4. Submit the answer.
5. Continue to the next Recall round.

### Expected Result

- The player's drawing is displayed as a memory prompt.
- The player can enter and submit an answer.
- The answer is submitted for the correct Recall round.
- Multiplayer players remain synchronised between rounds.

---

## AT-13 - Recall Scoring

### Steps

Submit several different types of answers:

1. An exact answer.
2. A similar but not exact answer.
3. An incorrect answer.

### Expected Result

- Each Recall answer receives a score between 0 and 4.
- An exact answer receives the maximum score.
- A similar answer may receive partial points.
- An incorrect answer can receive 0 points.
- Scores are calculated by the server in multiplayer games.
- Scores accumulate across Recall rounds.

---

## AT-14 - Anonymous Recall

### Steps

1. Create a multiplayer room.
2. Select Sketch Recall: Anonymous Swap.
3. Start the game.
4. Complete the Drawing and Distraction phases.
5. Reach Recall.

### Expected Result

- The normal Drawing and Distraction phases still work.
- During Recall, a player can receive another player's drawing.
- The identity of the player who created the drawing is not shown.
- Recall answers are still scored normally.

---

## AT-15 - Team Abilities

### Steps

1. Reach a multiplayer Recall round.
2. Have players vote for the Hint ability.
3. Test the ability after the required number of votes is reached.
4. Repeat the process with Reveal in another suitable round.

### Expected Result

- Ability votes are shared between the players.
- An ability activates when enough players vote for it.
- Hint and Reveal affect the Recall round as intended.
- An ability cannot be repeatedly used after it has already been used in the game.

---

## AT-16 - Multiplayer Leaderboard

### Steps

1. Complete all Recall rounds with at least two players.
2. Reach the results screen.

### Expected Result

- All players are shown on the final leaderboard.
- Each player's total score is displayed.
- Players are ranked based on their final score.
- The current player can see their own result.

---

## AT-17 - Final Drawing Gallery

### Steps

1. Complete a multiplayer game.
2. Reach the final results screen.
3. View the drawing gallery below the leaderboard.

### Expected Result

- The submitted drawings are displayed.
- Drawings from the completed game can be viewed by the players.
- The gallery loads without affecting the leaderboard or results screen.

---

## AT-18 - Play Again

### Steps

1. Complete a multiplayer game.
2. As the host, select Play Again.

### Expected Result

- All connected players return to the lobby.
- Player ready states are reset.
- The host can change the game settings.
- Another game can be started using the same room.

---

## AT-19 - Leave Room

### Steps

1. Reach the multiplayer results screen.
2. Select Leave Room.

### Expected Result

- The player leaves the multiplayer room.
- The player returns to the main game selection screen.

---

## AT-20 - Automated Tests and Builds

Run the frontend tests:

```bash
npm run test:run --prefix frontend
```

Run the frontend production build:

```bash
npm run build --prefix frontend
```

Run the backend tests:

```bash
npm test --prefix backend
```

Run the backend build:

```bash
npm run build --prefix backend
```

### Expected Result

- Frontend tests complete successfully.
- Frontend build completes successfully.
- Backend tests complete successfully.
- Backend build completes successfully.
