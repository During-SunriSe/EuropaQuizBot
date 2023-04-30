import TelegramBot from "node-telegram-bot-api";
import {
  userCheck,
  checkName,
  checkAge,
  checkCategory,
  saveUsers,
  getJSON,
} from "./users/users.js";
import { translate } from "./translator.js";
import {
  questionText,
  optionsText,
  optsOptions,
  checkAnswer,
} from "./questions/questions.js";
import { setInfo } from "./users/sheetsInfo.js";

const BOT_TOKEN = "5996542018:AAGOw8-n2RQiMTzDAXWK73k_daWB9skG0e8";

const bot = new TelegramBot(process.env.BOT_TOKEN || BOT_TOKEN, {
  polling: true,
});

const ADMIN_ID = 512962834;

bot.setMyCommands([
  { command: "/restart", description: await translate("uk", "Начать заново") },
  { command: "/info", description: await translate("uk", "Информация") },
  {
    command: "/language",
    description: await translate("uk", "Изменение языка"),
  },
]);

function start() {
  save();

  bot.on("message", async (msg) => {
    const text = msg.text;
    const curUser = await userCheck(msg.from);

    if (curUser.botIsTexting === true) return;
    if (!text) {
      await bot.sendMessageDelay(
        curUser,
        await translate(curUser.language, "Прости, я тебя не понимаю")
      );
      return;
    }

    if (text === "/getJSON" && curUser.telegramId === ADMIN_ID) {
      await getJSON(bot, ADMIN_ID);
      return;
    }
    try {
      if (text === "/start") {
        await startScreen(curUser);
      } else if (text === "/restart") {
        await restartQuiz(curUser);
      } else if (text === "/info") {
        await sendInfo(curUser);
      } else if (text === "/language") {
        await changeLanguage(curUser);
      } else if (curUser.isAgeWriting) {
        await lookAtAge(curUser, text);
      } else if (curUser.isNameWriting) {
        await lookAtName(curUser, text);
      } else if (curUser.isLanguageChoosing) {
        await bot.sendMessageDelay(
          curUser,
          await translate(
            curUser.language ? curUser.language : "uk",
            "Сначала выбери, пожалуйста, язык 🙃"
          )
        );
      } else if (curUser.isInQuiz) {
        const res = await checkAnswer(
          curUser.questionNumber,
          text,
          curUser.category
        );
        await sendAnswer(curUser, res);
      } else if (curUser.isOutQuiz) {
        await endMenu(curUser);
      } else
        await bot.sendMessageDelay(
          curUser,
          await translate(
            curUser.language,
            "Чтобы продолжить, ознакомься с текстом и нажми на кнопку под ним)"
          )
        );
    } catch (e) {
      console.log(e);
      await getJSON(bot, ADMIN_ID);
    }
  });
  bot.on("polling_error", console.log);
  bot.on("webhook_error", (error) => {
    console.log(error.code);
  });

  bot.on("callback_query", async (msg) => {
    const curUser = await userCheck(msg.from);
    let callbackText = "";
    bot.answerCallbackQuery(msg.id, {
      text: callbackText,
      show_alert: true,
    });
    try {
      if (curUser.isLanguageChoosing) {
        if (msg.data === "uk" || msg.data === "ru") {
          await languageIsChanged(curUser, msg.data);
        }
      } else if (curUser.isNameWriting) {
        if (msg.data === "yes") {
          await nameApprove(curUser);
        } else if (msg.data === "change") {
          await addName(curUser, true);
        }
      } else if (
        !curUser.isInQuiz &&
        msg.data === `ok${curUser.questionNumber}`
      ) {
        await askQuestion(curUser);
      }
    } catch (e) {
      console.log(e);
      await getJSON(bot, ADMIN_ID);
    }
  });
}

async function startScreen(curUser) {
  if (!curUser.language) {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language ? curUser.language : "uk",
        "*Текст приветсвтия*"
      )
    );
    await changeLanguage(curUser);
  } else
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Чтобы начать заново нажми /restart")
    );
}

async function changeLanguage(curUser) {
  curUser.isLanguageChoosing = true;
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          {
            text: curUser.language === "ru" ? "Русский" : "Росiйська",
            callback_data: "ru",
          },
          {
            text: curUser.language === "ru" ? "Украинский" : "Українська",
            callback_data: "uk",
          },
        ],
      ],
    }),
  };
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language ? curUser.language : "uk",
      "Выбери язык, на котором тебе удобнее общаться"
    ),
    opts
  );
}

async function languageIsChanged(curUser, languageThatIsChosen) {
  await bot.sendMessageDelay(
    curUser,
    languageThatIsChosen === "ru"
      ? "Язык изменен на русский."
      : "Мова змінено на українську."
  );
  await bot.setMyCommands([
    {
      command: "/restart",
      description: await translate(languageThatIsChosen, "Начать заново"),
    },
    {
      command: "/info",
      description: await translate(languageThatIsChosen, "Информация"),
    },
    {
      command: "/language",
      description: await translate(languageThatIsChosen, "Изменение языка"),
    },
  ]);

  curUser.isLanguageChoosing = false;

  if (!curUser.language) {
    curUser.language = languageThatIsChosen;
    await sendInfo(curUser);

    addName(curUser);
  }
  curUser.language = languageThatIsChosen;
}

async function addName(curUser, rewrite = false) {
  curUser.isNameWriting = true;
  if (rewrite) {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Хорошо, как тебя зовут?")
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Я уже представился, теперь твоя очередь😊NКак тебя зовут?"
      )
    );
  }
}

async function sendInfo(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "*Поле для информации о конкурсе, правилах и боте*"
    )
  );
}

async function lookAtName(curUser, text) {
  let res = await checkName(text);
  if (res === "long") {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Пожалуйста, напиши свое имя одним словом 🙂"
      )
    );
  } else {
    const opts = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: await translate(curUser.language, "Да"),
              callback_data: "yes",
            },
          ],
          [
            {
              text: await translate(curUser.language, "Изменить"),
              callback_data: "change",
            },
          ],
        ],
      }),
    };
    curUser.name = res;
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, `Тебя зовут ${res}, правильно?`),
      opts
    );
  }
}

async function nameApprove(curUser) {
  curUser.isNameWriting = false;
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      `Супер, приятно познакомиться ${curUser.name}`
    )
  );
  await askForAge(curUser);
}

async function askForAge(curUser) {
  curUser.isAgeWriting = true;
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      `И последний вопрос перед началом 🙃NСколько тебе лет?`
    )
  );
}

async function lookAtAge(curUser, text) {
  let res = await checkAge(text);
  if (!res) {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Пожалуйста, напиши свой реальный возраст цифрами🙂"
      )
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, `Спасибо!`)
    );
    curUser.age = res;
    curUser.isAgeWriting = false;
    await checkCategory(curUser);
    await startQuiz(curUser);
  }
}

async function startQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "*Поле для текста перед началом викторины*NN(Ответы сейчас 1, 3, 2)"
    )
  );
  await askQuestion(curUser);
}

async function askQuestion(curUser) {
  if (curUser.questionNumber > 2) await endQuiz(curUser);
  else {
    curUser.isInQuiz = true;
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        await questionText(curUser.questionNumber, curUser.category)
      )
    );
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        await optionsText(curUser, curUser.category)
      ),
      {
        reply_markup: JSON.stringify({
          keyboard: [
            await optsOptions(curUser.questionNumber, curUser.category),
          ],
          resize_keyboard: true,
        }),
      }
    );
  }
}

async function sendAnswer(curUser, res) {
  if (res === "problem") {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Укажи вариант ответа")
    );
  } else if (res === "incorrect") {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Попробуй еще раз N*Возможно комментарий к неправильному ответу*"
      )
    );
    if (!curUser.isOutQuiz) {
      if (curUser.curPoints[curUser.curPoints.length - 1] > 0)
        curUser.curPoints[curUser.curPoints.length - 1]--;
    }
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Молодец!"),
      {
        reply_markup: JSON.stringify({
          hide_keyboard: true,
        }),
      }
    );
    curUser.questionNumber++;
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "*Комментарий к правильному ответу*"),
      {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              {
                text: await translate(curUser.language, "Понятно"),
                callback_data: `ok${curUser.questionNumber}`,
              },
            ],
          ],
        }),
      }
    );
    curUser.isInQuiz = false;
  }
}

async function endQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Поздравляю с завершением квиза!NN*Прощальный текст*"
    ),
    {
      reply_markup: JSON.stringify({
        hide_keyboard: true,
      }),
    }
  );
  if (!curUser.isOutQuiz) {
    curUser.points = curUser.curPoints.reduce((a, b) => +a + +b);
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, `Результат: ${curUser.points}`)
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        `Напоминаю, что как результат учитывается только первое прохождение)`
      )
    );
  }
  curUser.isInQuiz = false;
  curUser.isOutQuiz = true;
}

async function save() {
  setTimeout(async () => {
    await save();
    await saveUsers();
    setTimeout(async () => await setInfo(), 1000 * 60 * 1);
  }, 1000 * 60 * 5);
}

async function endMenu(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "Спасибо за прохождение квиза!")
  );
}

async function timeout(curUser, ms) {
  return new Promise((resolve) =>
    setTimeout(() => {
      curUser.botIsTexting = false;
      resolve();
    }, ms)
  );
}

TelegramBot.prototype.sendMessageDelay = async function (curUser, text, opts) {
  curUser.botIsTexting = true;
  await this.sendChatAction(curUser.telegramId, "typing");
  await timeout(curUser, text.length * 50);
  await this.sendMessage(curUser.telegramId, text, opts);
};

async function restartQuiz(curUser) {
  if (!curUser.points)
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Чтобы перезапустить квиз, тебе нужно пройти его хотя бы один раз"
      )
    );
  else {
    curUser.questionNumber = 0;
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Квиз начат заново"),
      {
        reply_markup: JSON.stringify({
          hide_keyboard: true,
        }),
      }
    );
    await askQuestion(curUser);
  }
}

start();
