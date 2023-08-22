import TelegramBot from "node-telegram-bot-api";
import {
  userCheck,
  checkName,
  checkAge,
  //  checkCategory,
  getJSON,
  saveUsers,
} from "./users/users.js";
import { translate } from "./translator.js";
import {
  explanationText,
  questionText,
  optionsText,
  optsOptions,
  checkAnswer,
  getComment,
  questionLength,
} from "./questions/questions.js";
import { setInfo } from "./users/sheetsInfo.js";
import {
  clearAdmin,
  clearAll,
  clearUser,
  saveUsersRedis,
} from "./redisConnect.js";
import dotenv from "dotenv";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

const ADMIN_ID = parseInt(process.env.ADMIN_ID);

process.on("uncaughtException", async (error, source) => {
  console.log(error, source);
  await bot.sendDocument(ADMIN_ID, "./users/users.json");
  console.log("Uncaughtable");
});

bot.setMyCommands([
  { command: "/info", description: "Правила" },
  { command: "/help", description: "Допомога" },
  { command: "/send", description: "Відправити малюнок" },
]);

function start() {
  save();

  bot.on("message", async (msg) => {
    const text = msg.text;
    const curUser = await userCheck(msg.from);

    try {
      if (curUser.botIsTexting === true) return;

      if (curUser.isSending) {
        if (text?.toLowerCase() === "скасувати") {
          await bot.sendMessageDelay(
            curUser,
            "Шкода, 😔 але ти завжди можеш зробити це пізніше!"
          );
          curUser.isSending = false;
        } else if (msg.photo || msg.document) {
          await sendIllustration(curUser, msg);
        } else {
          await bot.sendMessageDelay(curUser, "Чекаю на файл або фото 😌");
        }
        return;
      } else if (!text) {
        await bot.sendMessageDelay(curUser, "Пробач, я тебе не розумію");
        return;
      }

      if (text === "/getJSON" && curUser.telegramId === ADMIN_ID) {
        await getJSON(bot, ADMIN_ID);
        return;
      }

      if (text === "/save" && curUser.telegramId === ADMIN_ID) {
        await saveUsersRedis();
        return;
      }

      if (text === "/clear" && curUser.telegramId === ADMIN_ID) {
        clearAdmin();
        return;
      }

      if (text.includes("/sendNext") && curUser.telegramId === ADMIN_ID) {
        await askQuestion(await userCheck({ id: text.split(" ")[1] }));
        return;
      }

      if (text.includes("/clearUser") && curUser.telegramId === ADMIN_ID) {
        clearUser(text);
        return;
      }

      if (text.includes("/sendUser") && curUser.telegramId === ADMIN_ID) {
        let id = text.split(" ")[1];
        let curText = text.split(" ").slice(2).join(" ");
        if (!curText)
          bot.sendMessage(
            id,
            "Привіт, я бачу, що в тебе виникла технічна проблема. Мені дуже шкода 🙁 Я вже сповістив свого помічника, напиши йому, будь ласка, він тобі допоможе!!\n\n@BohdanTut"
          );
        else bot.sendMessage(id, curText);
        return;
      }

      if (text === "/clearAll" && curUser.telegramId === ADMIN_ID) {
        clearAll();
        return;
      }

      if (text === "/start") {
        await startScreen(curUser);
      } else if (text === "/info") {
        await sendInfo(curUser);
      } else if (text === "/help") {
        await help(curUser);
      } else if (text === "/send") {
        await wantToSend(curUser);
      } else if (curUser.helpAsking) {
        if (text.toLowerCase() === "скасувати") {
          cancelHelp(curUser);
        } else {
          sendHelp(curUser, text);
        }
      } else if (curUser.isAgeWriting) {
        await lookAtAge(curUser, text);
      } else if (curUser.isNameWriting) {
        await lookAtName(curUser, text);
      } else if (curUser.isBotNameWriting) {
        await lookAtName(curUser, text, true);
      } else if (curUser.isSending) {
        await lookAtName(curUser, text, true);
      } else if (curUser.isMediatorAnswerWriting) {
        await checkMediatorAnswer(curUser, text);
      } else if (curUser.whatIsForgotten) {
        await checkFirstAnswer(curUser, text);
      } else if (curUser.isGenderChoosing) {
        await bot.sendMessageDelay(curUser, "Обери відповідь, будь ласка 🙃", {
          reply_markup: JSON.stringify({ hide_keyboard: true }),
        });
      } else if (curUser.isInQuiz) {
        const res = await checkAnswer(curUser.questionNumber, text);
        await sendAnswer(curUser, res);
      } else if (curUser.isOutQuiz) {
        await endMenu(curUser);
      } else if (!curUser.gender) {
        if (text.toLowerCase().includes("так")) await chooseGender(curUser);
      } else
        await bot.sendMessageDelay(
          curUser,
          "Щоб продовжити, ознайомся з текстом та натисни на кнопку під ним 😉"
        );
    } catch (e) {
      console.log(e);
      await getJSON(bot, process.env.ADMIN_ID);
      if (curUser) {
        await bot.sendMessage(
          process.env.ADMIN_ID,
          "#ошибка\n\nТекст у " + curUser.telegramId
        );
      } else {
        await bot.sendMessage(process.env.ADMIN_ID, "#ошибка\n\nТекст");
      }
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

    if (curUser.botIsTexting === true) return;

    if (msg.data !== "#") await editButtons(msg);

    try {
      if (msg.data === "help") {
        AsksForHelp(curUser);
      } else if (msg.data.includes("note")) {
        await giveNote(curUser, msg.data);
        await bot.sendMessageDelay(curUser, "Дякую за відгук!");
      } else if (curUser.isGenderChoosing) {
        if (msg.data === "man" || msg.data === "woman") {
          await genderIsChosen(curUser, msg.data);
        }
      } else if (curUser.isNameWriting) {
        if (msg.data === "yes") {
          await nameApprove(curUser);
        } else if (msg.data === "change") {
          await addName(curUser, true);
        }
      } else if (curUser.isBotNameWriting) {
        if (msg.data === "yes") {
          await botNameApprove(curUser);
        } else if (msg.data === "change") {
          await addBotName(curUser, true);
        }
      } else if (curUser.firstQuestionAsking) {
        if (msg.data === "yeah") {
          await nameStory2(curUser);
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
      await getJSON(bot, process.env.ADMIN_ID);
      if (curUser) {
        await bot.sendMessage(
          process.env.ADMIN_ID,
          "#ошибка\n\nКнопки у " + curUser.telegramId
        );
      } else {
        await bot.sendMessage(process.env.ADMIN_ID, "#ошибка\n\nКнопки");
      }
    }
  });
}

async function startScreen(curUser) {
  if (!curUser.started) {
    curUser.started = true;
    const opts = {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: JSON.stringify({
        resize_keyboard: true,
        keyboard: [
          [
            {
              text: "Так!",
            },
          ],
        ],
      }),
    };
    await bot.sendMessage(
      curUser.telegramId,
      `Раді вітати у грі-квесті «ЧАРІВНИЙ СВІТ МЕДІАЦІЇ»!
      \nЗапрошуємо тебе доторкнутися до чарівного світу медіації за допомогою медіатора-мандрівника, який прибув з дружньої планети. 🌍
      \nВін буде давати тобі завдання та ставити запитання. Будь уважним, на кожне питання є декілька відповідей, і лише одна з них буде правильною. Правильні відповіді будуть магічно перетворюватися на бали. ✨ 
      \nТільки не засмучуйся, якщо правильна відповідь не підкориться тобі з першого разу – ти отримаєш трохи менше балів, але дізнаєшься нову та корисну інформацію. Пробуй різні варіанти, читай пояснення та знаходь правильну відповідь, як справжній дослідник. 🕵🕵‍♀️
      \nТи можеш проходити гру у зручний час, робити перерви та продовжувати з того місця, де зупинився. Усе твоє спілкування з медіатором-мандрівником буде збережено, та ти зможеш переглядати його час від часу. 
      \nЩомісяця визначатимуться 30 переможців, які першими наберуть максимальну кількість балів. 
      \nБільше інформації про гру та призи можна знайти <a href='https://docs.google.com/document/d/1Kw3fMgjkdaYNg2-k4cYk6S6gjBu1RkfF3N1qGmQ0xHg/edit?usp=sharing'>тут</a>.
      \nКоли будеш готовий розпочати, просто натисни на "Так!"😉 
      `,
      opts
    );
  } else await bot.sendMessageDelay(curUser, "Квест уже почався 😁");
}

async function chooseGender(curUser) {
  curUser.isGenderChoosing = true;
  await bot.sendPhoto(
    curUser.telegramId,
    "AgACAgIAAxkBAAIdw2Rvv-rNJta27n1SHVmLDOf9gd0iAAKJ0jEbyCGAS7Kn5ozGFc9wAQADAgADcwADLwQ",
    {
      reply_markup: JSON.stringify({
        hide_keyboard: true,
      }),
      caption: "Привіт! Я дуже хочу з тобою познайомитися 😃",
    }
  );
  const opts = {
    reply_markup: JSON.stringify({
      resize_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "Привіт, я хлопчик!",
            callback_data: "man",
          },
        ],
        [
          {
            text: "Привіт, я дівчинка!",
            callback_data: "woman",
          },
        ],
      ],
    }),
  };
  await bot.sendMessageDelay(curUser, "Ти хлопчик чи дівчинка?", opts);
}

async function genderIsChosen(curUser, GenderThatIsChosen) {
  curUser.gender = GenderThatIsChosen;
  curUser.isGenderChoosing = false;

  await addName(curUser);
}

async function addName(curUser, rewrite = false) {
  curUser.isNameWriting = true;
  if (rewrite) {
    await bot.sendMessageDelay(curUser, "Добре, напиши ще раз 😌");
  } else {
    await bot.sendMessageDelay(curUser, "Супер, а як тебе звати? 🙃");
  }
}

async function sendInfo(curUser) {
  await bot.sendMessageDelay(curUser, "На тебе чекають такі завдання:");
  await bot.sendMessageDelay(
    curUser,
    "•	Відповідати на мої запитання (за кожну правильну відповідь та виконане завдання тобі нараховуються бали. На кожне питання є декілька відповідей. Будь уважним, не всі з них правильні. Чим більше правильних відповідей з першої спроби, тим більше балів);"
  );
  await bot.sendMessageDelay(
    curUser,
    "•	Допомогти згадати моє ім’я (за це також будуть нараховані бали);"
  );
  await bot.sendMessageDelay(
    curUser,
    "•	Виконати творче завдання наприкінці гри (це не обов’язкове задання та його виконання не впливатиме на кількість зароблених тобою балів, однак надасть можливість отримати спеціальний приз);"
  );
  await bot.sendMessageDelay(
    curUser,
    "Детальніше про правила та призи <a href='https://docs.google.com/document/d/1Kw3fMgjkdaYNg2-k4cYk6S6gjBu1RkfF3N1qGmQ0xHg/edit?usp=sharing'>тут</a> 🧐",
    { parse_mode: "HTML" }
  );
}

async function lookAtName(curUser, text, forBot = false) {
  let res = await checkName(text);
  if (res === "long") {
    await bot.sendMessageDelay(
      curUser,
      "Будь ласка, напиши ім'я одним словом 🙂"
    );
  } else {
    const opts = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: "Правильно",
              callback_data: "yes",
            },
          ],
          [
            {
              text: "Змінити",
              callback_data: "change",
            },
          ],
        ],
      }),
    };
    if (!forBot) {
      curUser.name = res;
      await bot.sendMessageDelay(
        curUser,
        `${res}, так? Перевір, будь ласка, чи правильно написано ім'я 😊`,
        opts
      );
    } else {
      curUser.botName = res;
      await bot.sendMessageDelay(
        curUser,
        `Я медіатор-мандрівник на ім'я ${res}, так?😊`,
        opts
      );
    }
  }
}

async function nameApprove(curUser) {
  curUser.isNameWriting = false;
  await bot.sendMessageDelay(
    curUser,
    `Супер, приємно познайомитися, ${curUser.name}!`
  );
  await askForAge(curUser);
}

async function askForAge(curUser) {
  curUser.isAgeWriting = true;
  await bot.sendMessageDelay(curUser, `А скільки тобі років? 🙃`);
}

async function lookAtAge(curUser, text) {
  let res = await checkAge(text);
  if (!res) {
    await bot.sendMessageDelay(curUser, "Напиши цифрами свій реальний вік 🙂");
  } else {
    await bot.sendMessageDelay(curUser, `🤩`);
    curUser.age = res;
    curUser.isAgeWriting = false;
    // await checkCategory(curUser);
    await firstQuestion(curUser);
    //await startQuiz(curUser);
  }
}

async function firstQuestion(curUser) {
  curUser.firstQuestionAsking = true;
  curUser.whatIsForgotten = true;
  await bot.sendMessageDelay(
    curUser,
    "Ой, мені здається, я щось забув зробити... Як гадаєш, що саме?\n\n1. Привітатися 👋\n2. Поскаржитися на життя 🥲\n3. Назвати своє ім'я 🤔",
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
    await bot.sendMessageDelay(curUser, "Ні, здається привітався🙄");
  } else if (text === "2") {
    await bot.sendMessageDelay(
      curUser,
      "А ти з гумором 😂 мені це подобається! Ні, скаржитися не хотів 😌"
    );
  } else if (text === "3") {
    await bot.sendMessageDelay(
      curUser,
      "Так, правильно, як я міг про це забути? 😮 Дякую, що нагадав!",
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );

    curUser.whatIsForgotten = false;
    await nameStory(curUser);
  } else {
    await bot.sendMessageDelay(curUser, "Вкажи варіант відповіді");
  }
}

async function nameStory(curUser) {
  await bot.sendMessageDelay(curUser, "Мене звати…");
  await bot.sendMessageDelay(curUser, "Мене звааааааатиии… ");
  await bot.sendMessageDelay(curUser, "упс… 😐");
  await bot.sendMessageDelay(curUser, "я не пам’ятаю…");
  await bot.sendMessageDelay(
    curUser,
    "Здається, трапився якийсь глюк під час моєї телепортації до тебе з чарівної планети. Ніяк не можу пригадати своє ім’я. Сподіваюся, що це тимчасово 🤔"
  );
  await bot.sendMessageDelay(
    curUser,
    "Знаєш, якщо ти хочеш мати приємне спілкування з іншою людиною, важливо познайомитися та звертатися на ім’я. Один мудрець 🧙🏻 сказав, що ім’я — найсолодший і найважливіший для людини звук будь-якою мовою "
  );
  await bot.sendMessageDelay(
    curUser,
    "До речі, цікавий факт! 😃 Твоє право на ім’я є у тебе з народження, та ніхто не може його порушувати"
  );
  await bot.sendMessageDelay(
    curUser,
    "Бачу, ти вже можеш рухатися далі, так? 😉",
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: "Так!",
              callback_data: "yeah",
            },
          ],
        ],
      }),
    }
  );
}

async function nameStory2(curUser) {
  await bot.sendMessageDelay(
    curUser,
    "Супер, тоді перше завдання тобі - допоможи мені згадати моє ім'я 😅",
    { reply_markup: JSON.stringify({ hide_keyboard: true }) }
  );
  await bot.sendMessageDelay(
    curUser,
    "Для цього я розповім тобі більше про себе"
  );
  await bot.sendMessageDelay(
    curUser,
    "Я прибув з чудової планети, де всі мешканці розмовляють одне з одним голосом 🗣, а чують вухами 👂"
  );
  await bot.sendMessageDelay(
    curUser,
    "Відчуваю твоє здивування, адже здається, що і на Землі люди спілкуються так само 😆"
  );
  await bot.sendMessageDelay(curUser, "Однак! Казати і чути можна по-різному ");
  await bot.sendMessageDelay(
    curUser,
    "Словом можна образити 😔, а на образу виникне злість 😠. Потім це може перерости у сварку чи навіть бійку. 🫣 Тобі знайомі такі конфліктні ситуації?"
  );
  await bot.sendMessageDelay(
    curUser,
    "На нашій планеті ні сварок, ні бійок, тому що всіх змалку навчають, що конфлікти це не погано, а іноді навіть добре. Важливо: якщо вони виникають, то вирішувати їх шляхом перемовин 🤝"
  );
  await bot.sendMessageDelay(
    curUser,
    "В нас є такі чарівники, які називаються – МЕДІАТОРИ"
  );
  await bot.sendMessageDelay(
    curUser,
    "Саме вони допомагають сторонам конфлікту правильно використовувати голос, слова та вуха 😌 Далі я тобі поясню детальніше про цю магію 😄"
  );
  await bot.sendMessageDelay(
    curUser,
    "Я теж є Медіатором з надзвичайно важливою місією 😎: мандрую різними планетами й світами, ділюся досвідом, знаннями й навичками 😁"
  );
  await bot.sendMessageDelay(
    curUser,
    "Моя місія зараз – навчити тебе, як чути та бути почутим, щоб не втрачати друзів та не псувати стосунки з близькими через конфлікти 😌"
  );
  await bot.sendMessageDelay(curUser, "Тобі щось відомо про Медіаторів?", {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          {
            text: "Так",
            callback_data: "yeah1",
          },
          {
            text: "Ні",
            callback_data: "no1",
          },
        ],
      ],
    }),
  });
}

async function mediatorsKnow(curUser, know) {
  if (know) {
    await bot.sendMessageDelay(
      curUser,
      "О, чудово ☺ Радує твоя обізнаність, але дозволь я розповім тобі ще більше!"
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      "Нічого страшного, багато хто не знає 😉 Я тут для того, щоб це виправити. На нашій планеті багато століть тому теж ніхто про них не знав. Одного разу до нас прилетів схожий на мене чарівник та поділився досвідом й знаннями"
    );
  }
  await bot.sendMessageDelay(
    curUser,
    "Як думаєш, Медіатор це \n\n1. Прилад для гри на гітарі \n2. Особа, яка проводить медіацію \n3. Обидва варіанти",
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
      "Так, є таке 🤔, такий медіатор – це невеликий плоский пристрій для гри на гітарі та деяких інших струнних інструментах 🎸. Але не про нього ми будемо з тобою спілкуватися. Обери інший варіант відповіді 🙂"
    );
  } else if (text === "2") {
    await bot.sendMessageDelay(
      curUser,
      "Так, і саме про них ми будемо спілкуватись з тобою! Хоча ти маєш знати, що медіатором також є невеликий плоский пристрій, що використовується для гри на гітарі та деяких інших струнних інструментах 🎸",
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
    curUser.isMediatorAnswerWriting = false;
    await startQuizQuestion(curUser);
  } else if (text === "3") {
    await bot.sendMessageDelay(
      curUser,
      "Правильно! Є медіатор, який використовується для гри на гітарі, але ми будемо спілкуватися про Медіаторів, які проводять медіацію 😌",
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
    curUser.isMediatorAnswerWriting = false;
    await startQuizQuestion(curUser);
  } else {
    await bot.sendMessageDelay(curUser, "Вкажи варіант відповіді");
  }
}

async function startQuizQuestion(curUser) {
  await bot.sendMessageDelay(
    curUser,
    "Здається, що ми можемо починати заробляти тобі бали, стартуємо?",
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: "Так",
              callback_data: "yeah2",
            },
            {
              text: "Ні",
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
      "Супер! Але дозволь я тобі спочатку розповім про правила 😁 Вони <a href='https://docs.google.com/document/d/1Kw3fMgjkdaYNg2-k4cYk6S6gjBu1RkfF3N1qGmQ0xHg/edit?usp=sharing'>тут</a>",
      { parse_mode: "HTML", disable_web_page_preview: true }
    );
  } else {
    await bot.sendMessageDelay(
      curUser,
      "Згоден, спочатку про правила, бо правила важлива річ 😁 Вони <a href='https://docs.google.com/document/d/1Kw3fMgjkdaYNg2-k4cYk6S6gjBu1RkfF3N1qGmQ0xHg/edit?usp=sharing'>тут</a>",
      { parse_mode: "HTML", disable_web_page_preview: true }
    );
  }
  await sendInfo(curUser);
  await startQuiz(curUser);
}

async function startQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    "Я знаю, що на вашій планеті теж існує медіація, а у твоїй країні навіть є Закон про медіацію та Медіаторів 😲"
  );
  await askQuestion(curUser);
}

async function showExplanation(curUser) {
  let explanation = await explanationText(curUser.questionNumber);
  for (let i = 0; i < explanation.length; i++) {
    if (i === explanation.length - 1) {
      await bot.sendMessageDelay(curUser, explanation[i], {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              {
                text: "Зрозуміло",
                callback_data: `ok${curUser.questionNumber}`,
              },
            ],
          ],
        }),
      });
    } else await bot.sendMessageDelay(curUser, explanation[i]);
  }
}

async function askQuestion(curUser) {
  if (curUser.questionNumber >= questionLength) await endQuiz(curUser);
  else {
    curUser.isInQuiz = true;
    const extraComments = await getComment(curUser.questionNumber - 1);
    if (extraComments.length) {
      for (let i = 0; i < extraComments.length; i++) {
        await bot.sendMessageDelay(curUser, extraComments[i]);
      }
    }
    await bot.sendMessageDelay(
      curUser,
      await questionText(curUser.questionNumber)
    );
    await bot.sendMessageDelay(curUser, await optionsText(curUser), {
      reply_markup: JSON.stringify({
        keyboard: [await optsOptions(curUser.questionNumber)],
        resize_keyboard: true,
      }),
    });
  }
}

async function sendAnswer(curUser, res) {
  const num = +res.split(" ")[1];
  res = res.split(" ")[0];
  if (res === "problem") {
    await bot.sendMessageDelay(
      curUser,
      "Вкажи варіант відповіді (1, 2,... тощо)"
    );
  } else if (res === "incorrect") {
    await bot.sendMessageDelay(
      curUser,
      await getComment(curUser.questionNumber, num)
    );
    if (!curUser.isOutQuiz) {
      if (curUser.curPoints[curUser.curPoints.length - 1] > 1)
        curUser.curPoints[curUser.curPoints.length - 1]--;
    }
  } else {
    await bot.sendMessageDelay(
      curUser,
      (
        await getComment(curUser.questionNumber, num)
      )[0],
      {
        reply_markup: JSON.stringify({
          hide_keyboard: true,
        }),
      }
    );
    const inlineArr = [
      [
        {
          text: "Зрозуміло",
          callback_data: `ok${curUser.questionNumber + 1}`,
        },
      ],
    ];
    if (curUser.questionNumber === 8) {
      inlineArr[0][0].text = "Не цікаво";
      inlineArr.unshift([
        {
          text: "Цікаво!",
          callback_data: `want${curUser.questionNumber + 1}`,
        },
      ]);
    }
    if (curUser.questionNumber === 4) {
      inlineArr[0][0].text = "Дякую!";
    }
    if (curUser.questionNumber === 6) {
      inlineArr[0][0].text = "Далі";
    }
    await bot.sendMessageDelay(
      curUser,
      (
        await getComment(curUser.questionNumber, num)
      )[1],
      {
        reply_markup: JSON.stringify({
          inline_keyboard: inlineArr,
        }),
      }
    );
    curUser.questionNumber++;
    curUser.isInQuiz = false;
  }
}

async function endQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    "Отже, ми з тобою дізнались про медіацію та Медіаторів. Залишилося розкрити тобі головний секрет 🤫 Магія медіації відбувається, коли сторонам вдалося знайти таке рішення, яким вони задоволені. Тоді кожен з них є переможцем 🥳",
    {
      reply_markup: JSON.stringify({
        hide_keyboard: true,
      }),
    }
  );
  if (!curUser.isOutQuiz) {
    await afterQuiz(curUser);
  }
}

async function afterQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    `А зараз пропоную повернутися до мого імені 🙃`
  );
  await bot.sendMessageDelay(
    curUser,
    `Підсумуємо - воно має бути вигаданим і відображати мої властивості:`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я вмію уважно слухати, наче маю чарівні вуха 👂👂`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я майстерно розмовляю і при цьому вмію тримати язика за зубами. Не розповідаю іншим про те, що дізнався від сторін конфлікту 🤐`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я вміло керую медіацією, наче диригент 😎 (ось і тут є чарівна паличка). Але не підказую, яке рішення краще, та не приймаю його`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я намагаюся розуміти почуття та потреби всіх у конфлікті 🙂`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я однаково доброзичливо 😃 ставлюся до всіх сторін конфлікту, не оцінюю та не засуджую їх`
  );
  await bot.sendMessageDelay(
    curUser,
    `Отже, ми підсумували! Саме час почути, яке ім’я ти мені придумав`
  );

  await addBotName(curUser);
}

async function addBotName(curUser, rewrite = false) {
  curUser.isBotNameWriting = true;
  if (rewrite) {
    await bot.sendMessageDelay(curUser, "Добре, напиши ще раз 😌");
  } else {
    await bot.sendMessageDelay(curUser, "Напиши твою пропозицію 😁");
  }
}

async function botNameApprove(curUser) {
  curUser.isBotNameWriting = false;
  await bot.sendMessageDelay(
    curUser,
    "Вау 🤩, супер! Дякую тобі. Тепер у мене знов є ім’я 🥳 Я був впевнений, що з цим завданням ти також впораєшся. Дам тобі цілих 16 балів за нього!"
  );
  curUser.curPoints.push(16);
  curUser.points = curUser.curPoints.reduce((a, b) => +a + +b);

  const dateObject = new Date();
  let date = dateObject.toUTCString();
  curUser.date = date;

  await bot.sendMessageDelay(
    curUser,
    `Вітаю! 🥳🎉 А тепер порахуємо набрані тобою бали. Юхуууу, твій результат - ${curUser.points} !👏👏👏`
  );
  await bot.sendMessageDelay(
    curUser,
    `В останній день цього місяця будуть визначені 30 переможців, яким вдалося отримати найбільшу кількість балів першими. Можливо ти будеш одним з них. Бажаю успіху!`,
    { parse_mode: "HTML", disable_web_page_preview: true }
  );
  await bot.sendMessageDelay(
    curUser,
    "Ледь не забув 😧 У мене для тебе ще одне творче завдання!"
  );
  await bot.sendMessageDelay(
    curUser,
    "Пропоную тобі стати чарівником та змінити мою зовнішність 🪄 Ти вже багато знаєш про мене і зможеш допомогти мені оновитися"
  );
  await bot.sendMessageDelay(
    curUser,
    "Я буду радий отримати багато малюнків, які будуть нагадувати мені про мандри та наші з тобою пригоди ☺ Якщо ти відчуваєш натхнення, то можеш намалювати і надіслати ілюстрації на теми квесту: конфліктний монстр, емоції, медіація чи щось інше, що тобі буде приємно намалювати."
  );

  await bot.sendMessageDelay(
    curUser,
    "Ти можеш надіслати один чи декілька малюнків до 1 вересня 2023 "
  );
  await bot.sendMessageDelay(curUser, "Для відправки натисни на /send");
  await bot.sendMessageDelay(
    curUser,
    "Автори кращих малюнків отримають призи відповідно до правил 😉"
  );
  await bot.sendMessageDelay(
    curUser,
    "Підсумки цього творчого конкурсу будуть підбиті 15.09.2023 року"
  );
  await bot.sendMessageDelay(
    curUser,
    curUser.name +
      ", ти молодець! Ще раз дякую тобі за ім’я та за прекрасну компанію. Надзвичайно радий нашому знайомству. Мені вже час вирушати далі - на іншу планету 🤗"
  );

  curUser.isInQuiz = false;
  curUser.isOutQuiz = true;

  await bot.sendMessageDelay(
    curUser,
    "Якщо в тебе залишилися запитання чи буде потрібна допомога у вирішенні конфлікту шляхом медіації - напиши моїм Земним друзям в Українську академію медіації (УАМ). ✨✨✨ Вони володіють магією медіації та обов’язково тобі допоможуть. УАМ також має сайт з купою корисної інформації 🙃",
    {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: "Написати до УАМ",
              url: "tg://user?id=" + process.env.ADMIN_SECOND_ID,
            },
          ],
          [
            {
              text: "Відвідати сайт УАМ",
              url: "https://mediation.ua",
            },
          ],
        ],
      }),
    }
  );

  await timeout(curUser, 2000);
  await bot.sendPhoto(
    curUser.telegramId,
    "AgACAgIAAxkBAAI0O2R5gHTWWSypbVy85Ktq-jpBnSeoAALvzDEbE__JS_y8JciTQ2vVAQADAgADcwADLwQ",
    {
      caption:
        "До нових зустрічей! 🤗✨ \nТвій медіатор-мандрівник " +
        curUser.botName +
        " 💙💛",
    }
  );

  const opts = {
    reply_markup: JSON.stringify({
      resize_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "☹",
            callback_data: "note1",
          },
          {
            text: "🙁",
            callback_data: "note2",
          },
          {
            text: "😐",
            callback_data: "note3",
          },
          {
            text: "🙂",
            callback_data: "note4",
          },
          {
            text: "😀",
            callback_data: "note5",
          },
        ],
      ],
    }),
  };
  await bot.sendMessageDelay(curUser, "Чи сподобався тобі квест?", opts);
}

async function help(curUser) {
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          {
            text: "Залишити повідомлення",
            callback_data: "help",
          },
        ],
      ],
    }),
  };
  await bot.sendMessageDelay(
    curUser,
    "Якщо виникли якісь проблеми з прохожденням квесту, ти можеш залишити повідомлення, і наша команда тобі допоможе!",
    opts
  );
}

async function AsksForHelp(curUser) {
  curUser.helpAsking = true;
  await bot.sendMessageDelay(
    curUser,
    'Чекаю на повідомлення. Для скасування напишіть "скасувати"'
  );
}

async function cancelHelp(curUser) {
  curUser.helpAsking = false;
  await bot.sendMessageDelay(
    curUser,
    "Добре, сподіваємося, що проблеми вирішилися 😌"
  );
}

async function sendHelp(curUser, text) {
  if (curUser.username) {
    bot.sendMessage(
      process.env.ADMIN_ID,
      `#помощь\n\nПользователь @${curUser.username} оставил сообщение:\n\n ${text}`
    );
    bot.sendMessage(
      process.env.ADMIN_SECOND_ID,
      `#помощь\n\nПользователь @${curUser.username} оставил сообщение:\n\n ${text}`
    );
  } else {
    bot.sendMessage(
      process.env.ADMIN_ID,
      `#помощь\n\nПользователь ${curUser.telegramId} оставил сообщение:\n\n ${text}`
    );
    bot.sendMessage(
      process.env.ADMIN_SECOND_ID,
      `#помощь\n\nПользователь ${curUser.telegramId} оставил сообщение:\n\n ${text}`
    );
  }
  await bot.sendMessageDelay(
    curUser,
    "Повідомлення відправлено. Сподіваємося, що зможемо тобі допомогти! 😉"
  );

  curUser.helpAsking = false;
}

async function save() {
  setTimeout(async () => {
    await save();
    await saveUsers();
    setTimeout(async () => await setInfo(), 1000 * 60 * 2);
  }, 1000 * 60 * 3);
}

async function endMenu(curUser) {
  await bot.sendMessageDelay(curUser, "Дякую за прохождення квесту!");
}

async function giveNote(curUser, note) {
  if (note.includes("1")) curUser.note = "плохо";
  else if (note.includes("2")) curUser.note = "не очень";
  else if (note.includes("3")) curUser.note = "средне";
  else if (note.includes("4")) curUser.note = "хорошо";
  else curUser.note = "очень хорошо";
}

async function wantToSend(curUser) {
  if (!curUser.isOutQuiz) {
    await bot.sendMessageDelay(curUser, "Спочатку закінчи квест");
  } else {
    await bot.sendMessageDelay(
      curUser,
      'Я дуже радий, що ти щось намалював! 😊 Відправляй\n\nДля скасування напиши "скасувати"'
    );
    curUser.isSending = true;
  }
}

async function sendIllustration(curUser, msg) {
  if (msg.photo) {
    console.log(msg.photo);
    await bot.sendPhoto(process.env.ADMIN_ID, msg.photo[0].file_id, {
      caption: `#Малюнок\n\nКористувач ${
        curUser.username ? `@${curUser.username}` : curUser.telegramId
      }`,
    });
    await bot.sendPhoto(process.env.ADMIN_SECOND_ID, msg.photo[0].file_id, {
      caption: `#Малюнок\n\nКористувач ${
        curUser.username ? `@${curUser.username}` : curUser.telegramId
      }`,
    });
  } else {
    await bot.sendDocument(process.env.ADMIN_ID, msg.document.file_id, {
      caption: `#Малюнок\n\nКористувач ${
        curUser.username ? `@${curUser.username}` : curUser.telegramId
      }`,
    });
    await bot.sendDocument(process.env.ADMIN_SECOND_ID, msg.document.file_id, {
      caption: `#Малюнок\n\nКористувач ${
        curUser.username ? `@${curUser.username}` : curUser.telegramId
      }`,
    });
  }
  await bot.sendMessageDelay(curUser, "Ваааау, це так гарно, дякую!!!🥺");
  curUser.isSending = false;
}

async function editButtons(msg) {
  const buttons = msg.message.reply_markup.inline_keyboard;
  for (let i = 0; i < buttons.length; i++) {
    for (let j = 0; j < buttons[i].length; j++) {
      if (buttons[i][j].callback_data === msg.data) buttons[i][j].text += " ✅";
      buttons[i][j].callback_data = "#";
    }
  }
  bot.editMessageReplyMarkup(
    {
      inline_keyboard: buttons,
    },
    {
      chat_id: msg.from.id,
      message_id: msg.message.message_id,
    }
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
  await timeout(curUser, text.length * 50 > 5000 ? 5000 : text.length * 50);
  await this.sendMessage(curUser.telegramId, text, opts);
};

// async function restartQuiz(curUser) {
//   if (!curUser.points)
//     await bot.sendMessageDelay(
//       curUser,
//       "Щоб перезапустит квіз, його треба пройти хоча б один раз"
//     );
//   else {
//     curUser.questionNumber = 0;
//     curUser.isInQuiz = true;
//     await bot.sendMessageDelay(curUser, "Квиз розпочато знову", {
//       reply_markup: JSON.stringify({
//         hide_keyboard: true,
//       }),
//     });
//     await askQuestion(curUser);
//   }
// }

start();
