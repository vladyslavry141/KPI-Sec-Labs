import { request } from "undici";
const BASE_URL = "http://localhost:3000";

console.log("Request without header:");
console.log(
  await request(new URL("/", BASE_URL)).then(
    async (res) => await res.body.text()
  )
);

console.log("Request with correct header:");
const authorizationHeaderData = Buffer.from("DateArt:2408").toString("base64");
const authorizationHeader = `Basic ${authorizationHeaderData}`;
console.log(
  await request(new URL("/", BASE_URL), {
    headers: { Authorization: authorizationHeader },
  }).then(async (res) => await res.body.text())
);
