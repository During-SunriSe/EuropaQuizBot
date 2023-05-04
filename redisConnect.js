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
let users = JSON.parse(await client.get("usersRedis"));
try {
  fs.writeFileSync(
    "./users/users.json",
    JSON.stringify(users),
    function (err, file) {
      if (err) throw err;
    }
  );
} catch (err) {
  console.log(err);

  process.exit(1);
}
await client.disconnect();

export async function saveUsersRedis() {
  try {
    await client.connect();

    await client.set("usersRedis", JSON.stringify(users));

    await client.disconnect();
  } catch (e) {
    console.log(e);
  }
}

export { users };
