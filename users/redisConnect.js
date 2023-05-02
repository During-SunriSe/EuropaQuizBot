import redis from "redis";
import fs from "fs";
import url from "url";

var redisURL = url.parse(process.env.REDISCLOUD_URL);
var client = redis.createClient(redisURL.port, redisURL.hostname, {
  no_ready_check: true,
});
client.auth(redisURL.auth.split(":")[1]);

await client.connect();

client.set("foo", "bar");
client.get("foo", function (err, reply) {
  console.log(reply.toString()); // Will print `bar`
});
// const client = redis.createClient({
//   port: process.env.REDISCLOUD_URL,
//   host: "redis-server",
//   no_ready_check: true,
// });

// client.on("error", (err) => console.log("Redis Client Error", err));

// await client.connect();

// console.log(client.isOpen());

// client.set("usersJSON", fs.readFileSync("./users/users.json").toString());
// await client.get("usersJSON", function (err, reply) {
//   console.log(reply.toString()); // Will print `bar`
// });

// await client.disconnect();

// export async function getJSONfromRedis() {
//   await client.get("usersJSON", function (err, reply) {
//     console.log(reply.toString()); // Will print `bar`
//   });
// }
