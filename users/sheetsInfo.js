import fs from "fs";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const service = google.sheets("v4");

const authClient = new google.auth.JWT(
  process.env.client_email,
  null,
  process.env.private_key.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets"]
);

export async function setInfo() {
  const users = JSON.parse(fs.readFileSync("./users/users.json").toString());

  try {
    const token = await authClient.authorize();

    authClient.setCredentials(token);

    const res = await service.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: "16pmQFYrC1cFjnCC4NbjqmNXPiohL10Oy9gAqjRhmbUc",
      range: "A:A",
    });

    const usersInSheet = [];

    const rows = res.data.values;

    if (rows.length) {
      rows.shift();

      for (const row of rows) {
        usersInSheet.push(row[0]);
      }
    }

    for (const curUser of users) {
      const userLink = "https://t.me/" + curUser.username;
      await service.spreadsheets.values.append({
        auth: authClient,
        spreadsheetId: "16pmQFYrC1cFjnCC4NbjqmNXPiohL10Oy9gAqjRhmbUc",
        range: "A2",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              curUser.telegramId,
              userLink,
              curUser.name,
              curUser.gender === "man" ? "хлопчик" : "дівчинка",
              curUser.age,
              curUser.botName,
              ...curUser.curPoints,
              curUser.points,
              curUser.note,
            ],
          ],
        },
      });
    }
  } catch (err) {
    console.log(err);

    process.exit(1);
  }
}
