import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

let users = [];

const client = createClient({
  password: process.env.REDISCLOUD_PASSWORD,
  socket: {
    host: process.env.REDISCLOUD_HOST,
    port: process.env.REDISCLOUD_PORT,
  },
});

try {
  await client.connect();
  users = JSON.parse(await client.get("usersRedis"));
  for (const user of users) {
    user.botIsTexting = false;
  }
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

    console.log("Write json problem");
  }
  await client.disconnect();
} catch (e) {
  console.log(e);
  console.log("Redis problem");
}

export async function saveUsersRedis() {
  try {
    await client.connect();

    if (users.length !== 0)
      await client.set("usersRedis", JSON.stringify(users));

    await client.disconnect();
  } catch (e) {
    console.log(e);
    console.log("SaveUsers problem");
  }
}

export function clearAdmin() {
  users = users.filter((user) => {
    return user.telegramId !== 512962834;
  });
}

export function clearUser(text) {
  let id = text.split(" ")[1];
  users = users.filter((user) => {
    return user.telegramId !== parseInt(id);
  });
  id = id.slice(1);
  users = users.filter((user) => {
    return user.username !== id;
  });
}

export function clearAll() {
  users = users.filter((user) => {
    return false;
  });
}

export { users };
