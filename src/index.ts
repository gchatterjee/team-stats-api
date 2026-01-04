import "dotenv/config";
import express from "express";
import Client from "./nyrr_api_client/client/index.js";

const PORT = process.env.PORT;
const APP = express();

APP.get("/health", (_, res) => res.send());

APP.get("/test0", async (_, res) => {
  const client = new Client();
  res.send(await client.getRecentEvents());
});

APP.get("/test1", async (_, res) => {
  const client = new Client();
  res.send(await client.getTeamRunners("M2025", "NBR"));
});

APP.get("/test2", async (_, res) => {
  const client = new Client();
  res.send(await client.getAllRaceAwardRunners("M2025", "NBR"));
});

APP.listen(PORT, () => console.log(`listening on port ${PORT}`));
