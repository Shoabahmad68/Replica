import axios from "axios"

const client = axios.create({
  baseURL: "/api", // when ready, change to actual backend URL
  timeout: 30000
})
// future: axios or fetch wrapper
export async function noop(){ return null }

export default client
