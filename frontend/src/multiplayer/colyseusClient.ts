import { Client } from "@colyseus/sdk";

// dev: localhost, prod: replace with Render backend URL
const SERVER_URL = import.meta.env.VITE_COLYSEUS_URL ?? "ws://localhost:2567";

export const client = new Client(SERVER_URL);
