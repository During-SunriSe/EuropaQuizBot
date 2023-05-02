import redis from "redis";
import fs from "fs";

const client = redis.createClient(process.env.REDISCLOUD_URL, {
  no_ready_check: true,
});
await client.connect();

client.set("usersJSON", fs.readFileSync("./users/users.json").toString());
export async function getJSONfromRedis() {
  await client.get("usersJSON", function (err, reply) {
    console.log(reply.toString()); // Will print `bar`
  });
}
