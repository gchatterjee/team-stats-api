import axios, { type CreateAxiosDefaults } from "axios";
import https from "https";

console.log("configuring nyrr api client instance...");
const config: CreateAxiosDefaults = { baseURL: `${process.env.NYRR_API_URL}` };
if (process.env.ENVIRONMENT === "dev")
  config.httpsAgent = new https.Agent({ rejectUnauthorized: true });
console.log("configured nyrr api client instance!", { config });
export default axios.create(config);
