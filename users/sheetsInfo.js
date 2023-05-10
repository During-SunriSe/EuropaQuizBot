import fs from "fs";
import { google } from "googleapis";
import { readFile } from "fs/promises";

const service = google.sheets("v4");
const credentials = JSON.parse(
  await readFile(new URL("./credentials.json", import.meta.url))
);

const authClient = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key.replace(/\\n/g, "\n"),
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
              curUser.age,
              curUser.category,
              ...curUser.curPoints,
              curUser.points,
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
