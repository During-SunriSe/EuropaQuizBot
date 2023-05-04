import User from "./User.js";
import fs from "fs";
import process from "node:process";
import { saveUsersRedis } from "../redisConnect.js";

let users = JSON.parse(fs.readFileSync("./users/users.json").toString());

export async function userCheck(msgFrom) {
  let savedUser = users.find((user) => user.telegramId === msgFrom.id);
  if (!savedUser) {
    savedUser = new User(msgFrom.id, msgFrom.username);
    users.push(savedUser);
  }
  return savedUser;
}

export async function checkName(text) {
  if (text.split(" ").length !== 1) return "long";
  text = text[0].toUpperCase() + text.slice(1).toLowerCase();
  return text;
}

export async function checkAge(text) {
  const words = text.split(" ");
  for (const word of words) {
    if (word.length > 2) continue;
    const number = parseInt(word);
    if (number > 0 && number < 100) return number;
  }
  return 0;
}

export async function checkCategory(curUser) {
  if (curUser.age <= 10) curUser.category = 0;
  else curUser.category = 1;
}

export async function saveUsers() {
  for (const user of users) {
    user.botIsTexting = false;
  }
  try {
    fs.writeFile(
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
  await saveUsersRedis();
}

export async function getJSON(bot, ADMIN_ID) {
  await bot.sendDocument(ADMIN_ID, "./users/users.json");
}
