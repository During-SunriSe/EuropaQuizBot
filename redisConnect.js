import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const client = createClient({
  password: process.env.REDISCLOUD_PASSWORD,
  socket: {
    host: process.env.REDISCLOUD_HOST,
    port: process.env.REDISCLOUD_PORT,
  },
});

await client.connect();

export let users = await JSON.parse(
  (await client.get("usersRedis")).toString()
);

await client.disconnect();

export async function saveUsersRedis() {
  const usersJSON = fs.readFileSync("./users/users.json");
  try {
    await client.connect();
    await client.set("usersRedis", usersJSON);
    await client.disconnect();
  } catch (e) {
    console.log(e);
  }
  users = await JSON.parse((await client.get("usersRedis")).toString());
}
