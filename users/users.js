import User from "./User.js";
import fs from "fs";
import AWS from "aws-sdk";
import env from "dotenv";

env.config();

const s3 = new AWS.S3();

let users;
s3.getObject(
  { Bucket: "europaquizbot", Key: "users.json" },
  function (err, data) {
    if (!err) users = JSON.parse(data.Body.toString());
    else users = JSON.parse(fs.readFileSync("./users/users.json").toString());
  }
);

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
  // let response = await fetch(
  //   `https://www.behindthename.com/api/lookup.json?name=${text.toLowerCase()}&key=bo018949609`
  // );
  // let antwort = await response.json();
  // if (antwort.error) return "any";
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

  const buf = Buffer.from(JSON.stringify(users));

  const data = {
    Bucket: "europaquizbot",
    Key: "users.json",
    Body: buf,
    ContentEncoding: "base64",
    ContentType: "application/json",
    ACL: "public-read",
  };

  s3.upload(data, function (err, data) {
    if (err) {
      console.log(err);
      console.log("Error uploading data: ", data);
    } else {
      console.log("succesfully uploaded!!!");
    }
  });
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
}
