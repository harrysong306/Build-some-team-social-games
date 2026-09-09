# Build Some Team Social Games

### Structure

```
├── backend/            # Backend/server code
│   ├── src/
│   └── test/
├── frontend/           # Frontend/client code
│   ├── src/
│   └── public/
├── shared/             # Code/types shared between frontend and backend
├── tests/              # Integration/end-to-end tests
├── docs/               # Project documentation and design material
├── package.json        # Project dependencies
├── package-lock.json   # Project dependecy references, used in development. - Will discontinue
└── README.md           # This document
```

### initial project discription:
Project: Build Some Team Social Games Client: Yi Fei Wu (Melbourne)
What client wants: Our client’s remote team enjoys online social games like Scattergories and Codenames, and wants us to build a few new browser-based games they can play together.

Requirements:

- Must run entirely in the browser — no installation needed

- Can’t be a 1:1 copy of an existing game — if similar, we need to add a twist

- At least one game should be cooperative, similar in style to Spaceteam
Notes:

- This is fairly open-ended. No strict spec is required for games, just a creative brief for the client to approve.

- Low backend/auth complexity, mostly frontend + real-time multiplayer logic.

### Starting:

1. `npm install` in base directory. Ensure node 22+ is installed.
2. Reference each directory README for specific instructions.


 ### Current Games:

Sketch Recall (Name pending):
- 

 ### Services:

 - Vite

 - Colyseus

