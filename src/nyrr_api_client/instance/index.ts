import axios, { type CreateAxiosDefaults } from "axios";
import axiosRetry from "axios-retry";
import https from "https";

const RETRIES = 5;

console.log("configuring nyrr api client instance...");
const config: CreateAxiosDefaults = { baseURL: `${process.env.NYRR_API_URL}` };
if (process.env.ENVIRONMENT === "dev")
  config.httpsAgent = new https.Agent({ rejectUnauthorized: true });
console.log("configured nyrr api client instance!", { config });
const instance = axios.create(config);
axiosRetry(instance, {
  retries: RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
  onRetry: (retryCount, error, requestConfig) => {
    console.warn(
      `retrying request... attempt #${retryCount} for ${requestConfig.url}`,
      { error, requestConfig },
    );
  },
});

export default instance;
