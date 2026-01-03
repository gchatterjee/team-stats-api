import "dotenv/config";
import express from "express";

const PORT = process.env.PORT;
const APP = express();

APP.get("/health", (_, res) => res.send());

APP.listen(PORT, () => console.log(`listening on port ${PORT}`));
