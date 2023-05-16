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
  explanationText,
  questionText,
  optionsText,
  optsOptions,
  checkAnswer,
} from "./questions/questions.js";
import { setInfo } from "./users/sheetsInfo.js";
import dotenv from "dotenv";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

const ADMIN_ID = parseInt(process.env.ADMIN_ID);

process.on("uncaughtException", async (error, source) => {
  console.log(error, source);
  await bot.sendDocument(ADMIN_ID, "./users/users.json");
});

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
      } else if (curUser.isBotNameWriting) {
        await botNameAdd(curUser, text);
      } else if (curUser.isMediatorAnswerWriting) {
        await checkMediatorAnswer(curUser, text);
      } else if (curUser.whatIsForgotten) {
        await checkFirstAnswer(curUser, text);
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
      } else if (curUser.isOutQuiz && curUser.questionNumber === 0) {
        await endMenu(curUser);
      } else if (!curUser.language) {
        await changeLanguage(curUser);
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
    if (curUser.botIsTexting === true) return;
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
      } else if (curUser.firstQuestionAsking) {
        if (msg.data === "yeah") {
          await botName(curUser, true);
        } else if (msg.data === "no") {
          await botName(curUser, false);
        } else if (msg.data === "yeah1") {
          await mediatorsKnow(curUser, true);
        } else if (msg.data === "no1") {
          await mediatorsKnow(curUser, false);
        } else if (msg.data === "yeah2") {
          await startQuizAnswer(curUser, true);
        } else if (msg.data === "no2") {
          await startQuizAnswer(curUser, false);
        }
      } else if (
        !curUser.isInQuiz &&
        msg.data === `ok${curUser.questionNumber}`
      ) {
        await askQuestion(curUser);
      } else if (
        !curUser.isInQuiz &&
        msg.data === `want${curUser.questionNumber}`
      ) {
        await showExplanation(curUser);
      }
    } catch (e) {
      console.log(e);
      await getJSON(bot, ADMIN_ID);
    }
  });
}

async function startScreen(curUser) {
  if (!curUser.language) {
    const opts = {
      reply_markup: JSON.stringify({
        resize_keyboard: true,
        keyboard: [
          [
            {
              text: "Привіт!",
              callback_data: "hello",
            },
          ],
        ],
      }),
    };
    await bot.sendMessageDelay(curUser, "Привіт!", opts);
  } else
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Чтобы начать заново нажми /restart")
    );
}

async function changeLanguage(curUser) {
  curUser.isLanguageChoosing = true;
  await bot.sendMessageDelay(
    curUser,
    await translate("uk", "Я хочу с тобой познакомиться!"),
    { reply_markup: JSON.stringify({ hide_keyboard: true }) }
  );
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

    await addName(curUser);
  } else {
    await bot.sendMessageDelay(
      curUser,
      languageThatIsChosen === "ru"
        ? "Язык изменен на русский."
        : "Мову змінено на українську."
    );
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
        "Отлично, как тебя зовут или как я могу к тебе обращаться?"
      )
    );
  }
}

async function sendInfo(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "Правила квесту прості:", "uk")
  );
  await bot.sendMessageDelay(
    curUser,
    (await translate(
      curUser.language,
      "Ми з тобою маємо згадати моє ім’я.",
      "uk"
    )) +
      " " +
      (await translate(
        curUser.language,
        "Я ставлю питання, - ти на них відповідаєш, користуючись тим, що я тобі розповів.",
        "uk"
      )) +
      " " +
      (await translate(
        curUser.language,
        "На кожне питання є декілька відповідей.",
        "uk"
      )) +
      " " +
      (await translate(
        curUser.language,
        "Будь уважним, не всі з них вірні.",
        "uk"
      )) +
      " " +
      (await translate(
        curUser.language,
        "Але ж натиснувши на не правильну відповідь ти дізнаєшся чому вона не вірна і в тебе з’являться наступні спроби.",
        "uk"
      )) +
      " " +
      (await translate(
        curUser.language,
        "Чим більше правильних відповідей з першої спроби, тим більше балів.",
        "uk"
      )) +
      " " +
      (await translate(
        curUser.language,
        "Ти не обмежений в часі і кількості спроб.",
        "uk"
      ))
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
    await translate(curUser.language, `А сколько тебе лет?🙃`)
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
    await firstQuestion(curUser);
    //await startQuiz(curUser);
  }
}

async function firstQuestion(curUser) {
  curUser.firstQuestionAsking = true;
  curUser.whatIsForgotten = true;
  bot.sendMessageDelay(
    curUser,
    (await translate(
      curUser.language,
      "Ой, мені здається, я щось забув) NПеревіримо твою уважність, вона нам знадобиться:NN1.",
      "uk"
    )) +
      " " +
      (await translate(curUser.language, "Поздороваться N2.")) +
      " " +
      (await translate(curUser.language, "Поскаржитись на життяN3.", "uk")) +
      " " +
      (await translate(curUser.language, "Представиться)")),
    {
      reply_markup: JSON.stringify({
        resize_keyboard: true,
        keyboard: [
          [
            {
              text: "1",
            },
            { text: "2" },
            { text: "3" },
          ],
        ],
      }),
    }
  );
}

async function checkFirstAnswer(curUser, text) {
  if (text === "1") {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Здається привітався🙄", "uk")
    );
  } else if (text === "2") {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "А ти з гумором) мені це подобається!",
        "uk"
      )
    );
  } else if (text === "3") {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Так, ти правий, як я міг про це забути🤔",
        "uk"
      ),
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );

    curUser.whatIsForgotten = false;
    await nameStory(curUser);
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Укажи вариант ответа")
    );
  }
}

async function nameStory(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Мене звати… упс… я , здається, не пам’ятаю…",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Сумно… щось трапилось, це мабуть пов’язано з тим, що мене було переміщено з чудової країни до тебе і по дорозі мені забули записати ім’я))",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Я дуже хочу з тобою познайомитись, але як же це зробити, я не пам’ятаю як мене звати😔",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "Ну що ж… Почнемо квест!", "uk")
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "В мене до тебе є перша справа)", "uk")
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "Допоможи мені згадати моє ім’я🥺", "uk")
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Я розповім тобі те що пам’ятаю та може ми з тобою разом згадаємо моє ім’я😌",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "Сподіваюсь, що ти згоден?😅", "uk"),
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: await translate(curUser.language, "Да"),
              callback_data: "yeah",
            },
            {
              text: await translate(curUser.language, "Нет"),
              callback_data: "no",
            },
          ],
        ],
      }),
    }
  );
}

async function botName(curUser, agree) {
  if (agree) {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Супер, тоді почнемо, але ж спочатку, попрошу тебе придумати мені тимчасове ім’я, щоб нам було зручно спілкуватись🙃",
        "uk"
      ),
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Так, ти правий, мені теж здається це буде не зручно, тож поки що попрошу тебе придумати мені тимчасове ім’я, щоб нам було зручно спілкуватись🙃",
        "uk"
      ),
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
  }
  curUser.isBotNameWriting = true;
}

async function botNameAdd(curUser, text) {
  curUser.botName = text;
  curUser.isBotNameWriting = false;
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Чудово, тепер ти можеш до мене звертатись саме так ☺️",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "То я тобі обіцяв розповісти про себе, слухай)",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Я, прибув з чудової планети ________ ",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Мешканці нашої планети розмовляють один з одним голосом , а чують вухами.",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Ой, ти зараз запитаєш, що це я таке кажу… начебто у вас не так)",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Так то воно так)) але ж казати і чути можна по різному",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Словом можна образити, а на образу виникне злість і якщо не почути один одного то буде сварка чи ще гірше бійка 🫣NТобі знайомі такі приклади?",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "На нашій планеті ні сварок ні бійок, тому що, всіх змалку навчають, що конфлікти це не погано, іноді навіть добре, але ж коли  вони виникають то вирішувати їх треба шляхом перемовин.",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "В нас є такі чарівники, які називаються – МЕДІАТОРИ.",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Саме вони покликанні допомогти використовувати голос і вуха) трошки пізніше я тобі поясню, про що тут я наговорив😄",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "Одним з них є я 😁", "uk")
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "І от коли ми зрозуміли, що цей чарівний спосіб позбавив нашу планету негативу, сварок і бійок вже на сто років, так, ми саме відсвяткували цю подію, ми вирішили поділитись ним з іншими.",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Саме мене направили до тебе з місією – навчити тебе розумітися на конфліктах, вміло розв’язувати їх і опановувати нові знання.",
      "uk"
    )
  );
  await bot.sendMessageDelay(
    curUser,
    await translate(curUser.language, "Тобі щось відомо про Медіаторів?", "uk"),
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: await translate(curUser.language, "Да"),
              callback_data: "yeah1",
            },
            {
              text: await translate(curUser.language, "Нет"),
              callback_data: "no1",
            },
          ],
        ],
      }),
    }
  );
}

async function mediatorsKnow(curUser, know) {
  if (know) {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "О, чудово, ти не тільки з гумором, а ще й обізнаний!",
        "uk"
      )
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Нічого страшного, багато хто не знає, я тобі розповім 😌NNДоречі, на нашій планеті 100 років тому, теж ніхто про неї не знав, але одного разу до нас прилетів схожий на мене чарівник і навчив нас",
        "uk"
      )
    );
  }
  await bot.sendMessageDelay(
    curUser,
    (await translate(curUser.language, "Як думаєш Медіатор цеN1.", "uk")) +
      " " +
      (await translate(
        curUser.language,
        "Прилад для гри на гітарі N2.",
        "uk"
      )) +
      " " +
      (await translate(
        curUser.language,
        "Особа – яка проводить медіаціюN3.",
        "uk"
      )) +
      " " +
      (await translate(curUser.language, "Обидва варіанти", "uk")),
    {
      reply_markup: JSON.stringify({
        resize_keyboard: true,
        keyboard: [
          [
            {
              text: "1",
            },
            {
              text: "2",
            },
            {
              text: "3",
            },
          ],
        ],
      }),
    }
  );

  curUser.isMediatorAnswerWriting = true;
}

async function checkMediatorAnswer(curUser, text) {
  if (text === "1") {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Так, є таке, Медіатор (він же плектр) являє собою невеликий плоский виріб з пружного, міцного матеріалу з загостреним кутом, використовується для гри на гітарі",
        "uk"
      ),
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
    curUser.isMediatorAnswerWriting = false;
    await startQuizQuestion(curUser);
  } else if (text === "2") {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Так, і саме про нього ми будемо спілкуватись з тобою!",
        "uk"
      ),
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
    curUser.isMediatorAnswerWriting = false;
    await startQuizQuestion(curUser);
  } else if (text === "3") {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Вірно!", "uk"),
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
    curUser.isMediatorAnswerWriting = false;
    await startQuizQuestion(curUser);
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(curUser.language, "Укажи вариант ответа")
    );
  }
}

async function startQuizQuestion(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Мені здається, що ми можемо починати заробляти тобі бали, згоден?",
      "uk"
    ),
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: await translate(curUser.language, "Да"),
              callback_data: "yeah2",
            },
            {
              text: await translate(curUser.language, "Нет"),
              callback_data: "no2",
            },
          ],
        ],
      }),
    }
  );
}

async function startQuizAnswer(curUser, agree) {
  curUser.firstQuestionAsking = false;
  if (agree) {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Супер! Але, дозволь я тобі спочатку розповім про правила",
        "uk"
      )
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      await translate(
        curUser.language,
        "Згоден, спочатку про правила, бо правила важлива річ",
        "uk"
      )
    );
  }
  await sendInfo(curUser);
  await startQuiz(curUser);
}

async function startQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      "Ну что, поехали!NN(Ответы сейчас 1, 3, 2)"
    )
  );
  await askQuestion(curUser);
}

async function showExplanation(curUser) {
  await bot.sendMessageDelay(
    curUser,
    await translate(
      curUser.language,
      await explanationText(curUser.questionNumber, curUser.category)
    ),
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
                text: await translate(
                  curUser.language,
                  "Почему другие неправильны?"
                ),
                callback_data: `want${curUser.questionNumber}`,
              },
            ],
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
  curUser.questionNumber = 0;
  curUser.isInQuiz = false;
  curUser.isOutQuiz = true;
}

async function save() {
  setTimeout(async () => {
    await save();
    await saveUsers();
    setTimeout(async () => await setInfo(), 1000 * 60 * 2);
  }, 1000 * 60 * 3);
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
