import axios, { type CreateAxiosDefaults } from "axios";
import https from "https";

const config: CreateAxiosDefaults = { baseURL: `${process.env.NYRR_API_URL}` };
if (process.env.ENVIRONMENT === "dev")
  config.httpsAgent = new https.Agent({ rejectUnauthorized: true });
export default axios.create(config);
