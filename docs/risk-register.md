# Sprint 1 Risk Register

**Project:** Build Some Team Social Games – Sketch Recall  
**Team:** CITS3200 Team 31

| ID | Risk | Likelihood | Impact | Prevention / Avoidance | Mitigation |
|---|---|---|---|---|---|
| R1 | Running out of time and not completing the main game. | Medium | High | Keep the first version small, split work into clear tasks and check progress regularly. | Remove lower-priority features and focus on getting the main Sketch Recall game working. |
| R2 | The client may not like the game or the direction we take. | Low-Medium | High | Show designs and progress to the client regularly and get feedback early. | Make changes based on client feedback before too much work is done. |
| R3 | A team member may be unavailable because of illness or another unexpected issue. | Medium | Medium | Keep important work and information shared in GitHub or Teams so other members can understand it. | Redistribute the work and contact the unit coordinator if it seriously affects the project. |
| R4 | Different parts of the system may not work properly together. | Medium | High | Check the chosen technologies early and keep the frontend, backend and game logic separated where possible. | Replace or simplify the part causing the problem and keep the rest of the system working. |
| R5 | Incorrect or unreviewed work may be merged into the main GitHub branch. | Low | Medium | Use branches and pull requests and review changes before merging into main. | Use Git history to find the change and revert to the last working version. |
| R6 | A player may disconnect during a game. | Medium | Medium-High | Plan how reconnecting players will be handled and keep the current game state on the server. | Allow the player to reconnect where possible or let the remaining players continue. |
| R7 | Players may see delayed or different game states during multiplayer play. | Medium | High | Test multiplayer updates early and keep one shared game state on the server. | Reconnect or refresh the affected player state and simplify the feature if it is not reliable. |
