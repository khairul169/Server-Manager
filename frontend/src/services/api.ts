import axios from "axios";

export const baseUrl = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_APIURL || "http://localhost:3000";

const api = axios.create({
  baseURL: baseUrl + "/_api",
});

export default api;
