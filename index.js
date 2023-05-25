import TelegramBot from "node-telegram-bot-api";
import {
  userCheck,
  checkName,
  checkAge,
  checkCategory,
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
} from "./questions/questions.js";
import { setInfo } from "./users/sheetsInfo.js";
import { clearAdmin } from "./redisConnect.js";
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
  { command: "/restart", description: "Почати знову" },
  { command: "/info", description: "Правила" },
]);

function start() {
  save();

  bot.on("message", async (msg) => {
    const text = msg.text;
    const curUser = await userCheck(msg.from);

    if (curUser.botIsTexting === true) return;
    if (!text) {
      await bot.sendMessageDelay(curUser, "Пробач, я тебе не розумію");
      return;
    }

    if (text === "/getJSON" && curUser.telegramId === ADMIN_ID) {
      await getJSON(bot, ADMIN_ID);
      return;
    }
    if (text === "/clear" && curUser.telegramId === ADMIN_ID) {
      clearAdmin();
      return;
    }
    try {
      if (text === "/start") {
        await startScreen(curUser);
      } else if (text === "/restart") {
        await restartQuiz(curUser);
      } else if (text === "/info") {
        await sendInfo(curUser);
      } else if (curUser.isAgeWriting) {
        await lookAtAge(curUser, text);
      } else if (curUser.isNameWriting) {
        await lookAtName(curUser, text);
      } else if (curUser.isMediatorAnswerWriting) {
        await checkMediatorAnswer(curUser, text);
      } else if (curUser.whatIsForgotten) {
        await checkFirstAnswer(curUser, text);
      } else if (curUser.isGenderChoosing) {
        await bot.sendMessageDelay(curUser, "Обери відповідь, будь ласка 🙃", {
          reply_markup: JSON.stringify({ hide_keyboard: true }),
        });
      } else if (curUser.isInQuiz) {
        const res = await checkAnswer(
          curUser.questionNumber,
          text,
          curUser.category
        );
        await sendAnswer(curUser, res);
      } else if (curUser.isOutQuiz && curUser.questionNumber === 0) {
        await endMenu(curUser);
      } else if (!curUser.gender) {
        await chooseGender(curUser);
      } else
        await bot.sendMessageDelay(
          curUser,
          "Щоб продовжити, ознайомся з текстом та нажми на кнопку під ним 😉"
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
      if (curUser.isGenderChoosing) {
        if (msg.data === "man" || msg.data === "woman") {
          await genderIsChosen(curUser, msg.data);
        }
      } else if (curUser.isNameWriting) {
        if (msg.data === "yes") {
          await nameApprove(curUser);
        } else if (msg.data === "change") {
          await addName(curUser, true);
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
      await getJSON(bot, ADMIN_ID);
    }
  });
}

async function startScreen(curUser) {
  if (!curUser.gender) {
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
    await bot.sendMessage(
      curUser.telegramId,
      `Раді вітати у грі-квесті «ЧАРІВНИЙ СВІТ МЕДІАЦІЇ»!
      \nПропонуємо перевірити, що ти знаєш про конфлікти, як їх вирішувати і як себе в них поводити. Також запрошуємо тебе доторкнутися до чарівного світу медіації за допомогою медіатора-мандрівника, який прибув з дружньої планети. Він буде давати тобі завдання та ставити запитання. Будь уважним, на кожне питання є декілька відповідей і лише одне з них буде вірним. Правильні відповіді на запитання будуть магічно перетворюватися на бали. Також в тебе є можливість отримати бали за виконання додаткових творчих завдань.
      \nТільки не засмучуйся, якщо вірна відповідь не підкориться тобі з першого разу – це можливість дізнатися нову та корисну інформацію. Пробуй різні варіанти, читай пояснення та знаходь вірну відповідь як справжній дослідник. В тебе завжди є можливість дізнатися чому інші відповіді не є вірними - для цього просто на них натисни. 
      \nТи можеш проходити гру у зручний час, робити перерви та продовжувати з того місця де зупинився. Все твоє спілкування з медіатором-мандрівником буде збережено та ти зможеш переглядати його час від часу. 
      \nКожного місяця визначатимуться п’ять переможців, які першими наберуть найбільшу кількість балів. 
      \nБільше інформації про гру та призи можна знайти тут.
      \nТи готовий розпочати? 
      `,
      opts
    );
  } else
    await bot.sendMessageDelay(curUser, "Щоб почати знову, натисни /restart");
}

async function chooseGender(curUser) {
  curUser.isGenderChoosing = true;
  await bot.sendMessageDelay(
    curUser,
    "Привіт! Я дуже хочу з тобою познайомитися!",
    {
      reply_markup: JSON.stringify({
        hide_keyboard: true,
      }),
    }
  );
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          {
            text: "Я хлопчик!",
            callback_data: "man",
          },
          {
            text: "Я дівчинка!",
            callback_data: "woman",
          },
        ],
      ],
    }),
  };
  await bot.sendMessageDelay(curUser, "Ти хлопчик чи дівчинка?", opts);
}

async function genderIsChosen(curUser, GenderThatIsChosen) {
  curUser.isGenderChoosing = false;

  await addName(curUser);

  curUser.gender = GenderThatIsChosen;
}

async function addName(curUser, rewrite = false) {
  curUser.isNameWriting = true;
  if (rewrite) {
    await bot.sendMessageDelay(curUser, "Добре, напиши ще раз 😌");
  } else {
    await bot.sendMessageDelay(curUser, "Супер, а як тебе звати?");
  }
}

async function sendInfo(curUser) {
  await bot.sendMessageDelay(curUser, "Якщо коротко, то правила наступні:");
  await bot.sendMessageDelay(
    curUser,
    "•	Перше завдання - ми з тобою маємо згадати моє ім’я."
  );
  await bot.sendMessageDelay(
    curUser,
    "•	Друге завдання - я ставлю питання, і ти на них відповідаєш. За кожну вірну відповідь тобі нараховуються бали. На кожне питання є декілька відповідей. Будь уважним, не всі з них вірні. Чим більше правильних відповідей з першої спроби, тим більше балів. Ти не обмежений в часі і кількості спроб."
  );
  await bot.sendMessageDelay(
    curUser,
    "•	Останнє завдання – творче, про нього в кінці гри."
  );
  await bot.sendMessageDelay(curUser, "Більша детальна інформація тут:");
}

async function lookAtName(curUser, text) {
  let res = await checkName(text);
  if (res === "long") {
    await bot.sendMessageDelay(
      curUser,
      "Будь ласка, напиши свое им'я одним словом 🙂"
    );
  } else {
    const opts = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: "Так",
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
    curUser.name = res;
    await bot.sendMessageDelay(
      curUser,
      `${res}, так? Перевір, будь ласка, чи ти правильно написав ім'я 😊`,
      opts
    );
  }
}

async function nameApprove(curUser) {
  curUser.isNameWriting = false;
  await bot.sendMessageDelay(
    curUser,
    `Супер, приємно познайомитися ${curUser.name}!`
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
    await bot.sendMessageDelay(curUser, `Дякую!`);
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
    "Ой, мені здається, я щось забув зробити... Як гадаєш, що саме?\n\n1. Привітатися 👋\n2. Поскаржитись на життя 🥲\n3. Назвати своє ім'я 🤔",
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
      "А ти з гумором 😂 мені це подобається! Ні скаржитися не хотів 😌"
    );
  } else if (text === "3") {
    await bot.sendMessageDelay(
      curUser,
      "Так, ти правий, як я міг про це забути 😮 Дякую, що нагадав!",
      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );

    curUser.whatIsForgotten = false;
    await nameStory(curUser);
  } else {
    await bot.sendMessageDelay(curUser, "Вкажи варіант відповіді");
  }
}

async function nameStory(curUser) {
  await bot.sendMessageDelay(
    curUser,

    "Мене звати… упс… 😐 я , здається, не пам’ятаю…"
  );
  await bot.sendMessageDelay(
    curUser,

    "Здається, трапився якийсь глюк під час моєї телепортації  до тебе з чарівної планети. Ніяк не можу пригадати своє ім’я. Сподіваюсь, що це тимчасово 🤔"
  );
  await bot.sendMessageDelay(
    curUser,
    "Знаєш, якщо ти хочеш мати приємне спілкування з іншою людиною, важливо знати його ім’я та звертатися по імені. Один мудрець сказав, що ім’я -— найсолодший і найважливіший для людини звук будь-якою мовою"
  );
  await bot.sendMessageDelay(
    curUser,
    "Доречі цікавий факт! Твоє право на ім’я є у тебе з народження та ніхто не може його порушувати"
  );
  await bot.sendMessageDelay(
    curUser,
    "Бачу ти вже готовий рухатися далі, так?😉",
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
    "Я, прибув з чудової планети, розмовляють один з одним голосом, а чують вухами."
  );
  await bot.sendMessageDelay(
    curUser,
    "Відчуваю твоє здивування…, адже здається, що і на Землі люди спілкуються так само 😆"
  );
  await bot.sendMessageDelay(
    curUser,
    "Так то воно так 😁 але ж казати і чути можна по-різному"
  );
  await bot.sendMessageDelay(
    curUser,
    "Словом можна образити, а на образу виникне злість і якщо не почути один одного то буде сварка чи ще гірше бійка. 🫣 Тобі знайомі такі конфліктні ситуації?"
  );
  await bot.sendMessageDelay(
    curUser,
    "На нашій планеті ні сварок ні бійок, тому що, всіх змалку навчають, що конфлікти це не погано, іноді навіть добре, але ж коли  вони виникають то вирішувати їх треба шляхом перемовин."
  );
  await bot.sendMessageDelay(
    curUser,
    "В нас є такі чарівники, які називаються – МЕДІАТОРИ."
  );
  await bot.sendMessageDelay(
    curUser,
    "Саме вони допомагають сторонам конфлікту правильно використовувати голос, слова та вуха 😌 Далі я тобі поясню детальніше про цю магію 😄"
  );
  await bot.sendMessageDelay(
    curUser,
    "Я теж є медіатором з надзвичайно важливою місією – мандрую по різних планетах й світах та ділюся досвідом, знаннями та навичками 😁"
  );
  await bot.sendMessageDelay(
    curUser,
    "Моя місія зараз – навчити тебе як чути та бути почутим, щоб не втрачати друзів та не псувати стосунків з близькими через конфлікти"
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

      "О, чудово. Радує твоя обізнаність, але дозволь я розповім тобі ще більше!"
    );
  } else {
    await bot.sendMessageDelay(
      curUser,

      "Нічого страшного - багато хто не знає. Я тут для того, щоб це виправити. На нашій планеті багато століть тому, теж ніхто про них не знав. Одного разу до нас прилетів схожий на мене чарівник та поділився досвідом й знаннями"
    );
  }
  await bot.sendMessageDelay(
    curUser,
    "Як думаєш Медіатор це \n\n1. Прилад для гри на гітарі \n2. Особа, яка проводить медіацію \n3.Обидва варіанти",
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

      "Так, є таке, такий медіатор – це невеликий плоский пристрій для гри на гітарі та деяких інших струнних інструментах. Але не про нього ми будемо з тобою спілкуватися. Обери інший варіант відповіді",

      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
    curUser.isMediatorAnswerWriting = false;
    await startQuizQuestion(curUser);
  } else if (text === "2") {
    await bot.sendMessageDelay(
      curUser,

      "Так, і саме про нього ми будемо спілкуватись з тобою! Хоча ти маєш знати, що медіатором також є невеликий плоский пристрій, що використовується для гри на гітарі та деяких інших струнних інструментах",

      { reply_markup: JSON.stringify({ hide_keyboard: true }) }
    );
    curUser.isMediatorAnswerWriting = false;
    await startQuizQuestion(curUser);
  } else if (text === "3") {
    await bot.sendMessageDelay(
      curUser,
      "Вірно! Є медіатор, який використовується для гри на гітарі, але ми будемо спілкуватися про Медіатора, який проводить медіацію",
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
    "Мені здається, що ми можемо починати заробляти тобі бали, згоден?",
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

      "Супер! Але, дозволь я тобі спочатку розповім про правила. Вони тут ____"
    );
  } else {
    await bot.sendMessageDelay(
      curUser,

      "Згоден, спочатку про правила, бо правила важлива річ, вони тут ____"
    );
  }
  await sendInfo(curUser);
  await startQuiz(curUser);
}

async function startQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    "Супер, ти молодець! Приємно з тобою мати справу ☺\n\nНу що, почнемо (Ответы сейчас 1, 3, 2)"
  );
  await askQuestion(curUser);
}

async function showExplanation(curUser) {
  await bot.sendMessageDelay(
    curUser,

    await explanationText(curUser.questionNumber, curUser.category),
    {
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
    }
  );
}

async function askQuestion(curUser) {
  if (curUser.questionNumber > 2) await endQuiz(curUser);
  else {
    curUser.isInQuiz = true;
    await bot.sendMessageDelay(
      curUser,

      await questionText(curUser.questionNumber, curUser.category)
    );
    await bot.sendMessageDelay(
      curUser,

      await optionsText(curUser, curUser.category),
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
    await bot.sendMessageDelay(curUser, "Вкажи варіант відповіді");
  } else if (res === "incorrect") {
    await bot.sendMessageDelay(
      curUser,

      "Спробуй ще раз N*Возможно комментарий к неправильному ответу*"
    );
    if (!curUser.isOutQuiz) {
      if (curUser.curPoints[curUser.curPoints.length - 1] > 0)
        curUser.curPoints[curUser.curPoints.length - 1]--;
    }
  } else {
    await bot.sendMessageDelay(curUser, "Молодець!", {
      reply_markup: JSON.stringify({
        hide_keyboard: true,
      }),
    });
    curUser.questionNumber++;
    await bot.sendMessageDelay(curUser, "*Комментарий к правильному ответу*", {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: "Почему другие неправильны?",
              callback_data: `want${curUser.questionNumber}`,
            },
          ],
          [
            {
              text: "Понятно",
              callback_data: `ok${curUser.questionNumber}`,
            },
          ],
        ],
      }),
    });
    curUser.isInQuiz = false;
  }
}

async function endQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,

    "Поздравляю с завершением квиза!NN*Прощальный текст*",
    {
      reply_markup: JSON.stringify({
        hide_keyboard: true,
      }),
    }
  );
  if (!curUser.isOutQuiz) {
    curUser.points = curUser.curPoints.reduce((a, b) => +a + +b);
    await bot.sendMessageDelay(curUser, `Результат: ${curUser.points}`);
  } else {
    await bot.sendMessageDelay(
      curUser,

      `Напоминаю, что как результат учитывается только первое прохождение)`
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
  await bot.sendMessageDelay(curUser, "Спасибо за прохождение квиза!");
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
      "Щоб перезапустит квіз, його треба пройти хоча б один раз"
    );
  else {
    curUser.questionNumber = 0;
    await bot.sendMessageDelay(curUser, "Квиз розпочато знову", {
      reply_markup: JSON.stringify({
        hide_keyboard: true,
      }),
    });
    await askQuestion(curUser);
  }
}

start();
