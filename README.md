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

1. `npm install` in base directory. Ensure node 22+ is installed. or better 'npm ci' for better safer lock.json package handeling.
2. Reference each directory README for specific instructions.

### Testing procedure:
1. in the frontend run npm test.
2. again in the front end run npm run build.
3. in the back end run npm test.
these steps would make it so we know the tests and build run properly.

To run the game in test sessions:
1. in frontend npm run dev
2. in back end in another terminal run npm run dev.
we can have multiple player in differnt lobby in the same system from different browser page. 


 ### Current Games:

Sketch Recall (Name pending):
- 

 ### Services:

 - Vite

 - Colyseus

