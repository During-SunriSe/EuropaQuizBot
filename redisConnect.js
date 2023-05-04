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

let users = await client.get("usersRedis");

await client.disconnect();

export async function saveUsersRedis() {
  const usersJSON = JSON.stringify(
    fs.readFileSync("./users/users.json").toString()
  );
  try {
    await client.connect();

    await client.set("usersRedis", usersJSON);

    users = usersJSON;

    await client.disconnect();
  } catch (e) {
    console.log(e);
  }
}

export { users };
