// npx tsx src/TestClient.ts
// Generic tests just to make sure that the backend works

import { Client, getStateCallbacks } from "@colyseus/sdk"; // or wherever getStateCallbacks is exported from in your version

async function run() {
  const client = new Client("ws://localhost:2567");

  const room1 = await client.create("LobbyRoom", { name: "Jordan" });
  console.log("Room1 joined, sessionId:", room1.sessionId);

  const room2 = await client.joinById(room1.roomId, { name: "Sam" });
  console.log("Room2 joined, sessionId:", room2.sessionId);

  const $ = getStateCallbacks(room1); // wraps room1's state for callback binding

  $(room1.state).players.onAdd((p: any, id: string) => {
    console.log("Player added:", id, p.name, p.isHost);
  });

  room1.onMessage("name_error", (msg: any) => console.log("Name error:", msg.reason));

  room2.send("markReady", { ready: true });
  room2.send("changeName", { name: "Jordan" });
  room2.send("changeName", { name: "Sammy" });

  setTimeout(() => process.exit(0), 2000);
}

run();