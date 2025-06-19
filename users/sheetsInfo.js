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
  const spreadsheetId = "16pmQFYrC1cFjnCC4NbjqmNXPiohL10Oy9gAqjRhmbUc";

  try {
    const { tokens } = await authClient.authorize();
    authClient.setCredentials(tokens);

    await service.spreadsheets.values.clear({
      auth: authClient,
      spreadsheetId,
      range: "Лист1",
    });

    const curPointsCount = users[0]?.curPoints.length || 0;
    const header = [
      "Telegram ID",
      "Link",
      "Name",
      "Gender",
      "Age",
      "Bot Name",
      ...Array.from({ length: curPointsCount }, (_, i) => `Очки${i + 1}`),
      "Total Points",
      "Note",
      "Date",
    ];

    await service.spreadsheets.values.update({
      auth: authClient,
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });

    const valuesArr = users.map(u => [
      u.telegramId,
      `https://t.me/${u.username}`,
      u.name,
      u.gender === "man" ? "хлопчик" : "дівчинка",
      u.age,
      u.botName,
      ...u.curPoints,
      u.points,
      u.note,
      u.date,
    ]);

    // 3) Записываем их начиная со строки A2
    await service.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId,
      range: "Лист1!A2",
      valueInputOption: "RAW",
      requestBody: { values: valuesArr },
    });

    console.log("Данные перезаписаны успешно!");
  } catch (err) {
    console.error("Sheets error:", err);
  }
}
