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
import { clearAdmin, clearAll } from "./redisConnect.js";
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

    if (msg.photo) {
      console.log(msg.photo[0].file_id);
      return;
    }

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
    if (text === "/clearAll" && curUser.telegramId === ADMIN_ID) {
      clearAll();
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
        const res = await checkAnswer(curUser.questionNumber, text);
        await sendAnswer(curUser, res);
      } else if (curUser.isOutQuiz && curUser.questionNumber === 0) {
        await endMenu(curUser);
      } else if (!curUser.gender) {
        if (text === "Так!") await chooseGender(curUser);
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
    bot.answerCallbackQuery(msg.id, {
      text: callbackText,
      show_alert: true,
    });
    if (curUser.botIsTexting === true) return;
    if (msg.data !== "#") await editButtons(msg);
    let callbackText = "";
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
  if (!curUser.started) {
    curUser.started = true;
    const opts = {
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
      \nПропонуємо перевірити, що ти знаєш про конфлікти, як їх вирішувати і як себе в них поводити. Також запрошуємо тебе доторкнутися до чарівного світу медіації за допомогою медіатора-мандрівника, який прибув з дружньої планети. Він буде давати тобі завдання та ставити запитання. Будь уважним, на кожне питання є декілька відповідей і лише одна з них буде вірною. Правильні відповіді на запитання будуть магічно перетворюватися на бали. Також в тебе є можливість отримати бали за виконання додаткових творчих завдань.
      \nТільки не засмучуйся, якщо вірна відповідь не підкориться тобі з першого разу – це можливість дізнатися нову та корисну інформацію. Пробуй різні варіанти, читай пояснення та знаходь вірну відповідь як справжній дослідник. В тебе завжди є можливість дізнатися чому інші відповіді не є вірними - для цього просто на них натисни. 
      \nТи можеш проходити гру у зручний час, робити перерви та продовжувати з того місця, де зупинився. Все твоє спілкування з медіатором-мандрівником буде збережено та ти зможеш переглядати його час від часу. 
      \nКожного місяця визначатимуться п’ять переможців, які першими наберуть найбільшу кількість балів. 
      \nБільше інформації про гру та призи можна знайти тут.
      \nКоли будеш готовий розпочати просто натисни на "Так!"😉 
      `,
      opts
    );
  } else
    await bot.sendMessageDelay(curUser, "Щоб почати знову, натисни /restart");
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
    await bot.sendMessageDelay(curUser, "Супер, а як тебе звати?");
  }
}

async function sendInfo(curUser) {
  await bot.sendMessageDelay(curUser, "На тебе чекають такі завдання:");
  await bot.sendMessageDelay(
    curUser,
    "•	Відповідати на мої запитання (за кожну вірну відповідь та виконане завдання тобі нараховуються бали. На кожне питання є декілька відповідей. Будь уважним, не всі з них вірні. Чим більше правильних відповідей з першої спроби, тим більше балів);"
  );
  await bot.sendMessageDelay(
    curUser,
    "•	Допомогти згадати моє ім’я (за це також будуть нараховані бали);"
  );
  await bot.sendMessageDelay(
    curUser,
    "•	Виконати творче завдання наприкінці гри (це не обов’язкове задання та його виконання не впливатиме на кількість зароблених тобою балів, однак надасть можливість отримати спеціальний приз)."
  );
  await bot.sendMessageDelay(curUser, "Детальніше про правила та призи тут 🧐");
}

async function lookAtName(curUser, text) {
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
    // await checkCategory(curUser);
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
      "А ти з гумором 😂 мені це подобається! Ні, скаржитися не хотів 😌"
    );
  } else if (text === "3") {
    await bot.sendMessageDelay(
      curUser,
      "Так, вірно, як я міг про це забути 😮 Дякую, що нагадав!",
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
    "Знаєш, якщо ти хочеш мати приємне спілкування з іншою людиною, важливо знати його ім’я та звертатися по імені. Один мудрець сказав, що ім’я — найсолодший і найважливіший для людини звук будь-якою мовою"
  );
  await bot.sendMessageDelay(
    curUser,
    "Доречі, цікавий факт! Твоє право на ім’я є у тебе з народження та ніхто не може його порушувати"
  );
  await bot.sendMessageDelay(
    curUser,
    "Бачу ти вже можеш рухатися далі, так?😉",
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
    "Я прибув з чудової планети, де всі мешканці розмовляють один з одним голосом, а чують вухами."
  );
  await bot.sendMessageDelay(
    curUser,
    "Відчуваю твоє здивування…, адже здається, що і на Землі люди спілкуються так само 😆"
  );
  await bot.sendMessageDelay(curUser, "Однак! Казати і чути можна по-різному");
  await bot.sendMessageDelay(
    curUser,
    "Словом можна образити, а на образу виникне злість та, якщо не почути один одного, то буде сварка чи ще гірше бійка. 🫣 Тобі знайомі такі конфліктні ситуації?"
  );
  await bot.sendMessageDelay(
    curUser,
    "На нашій планеті ні сварок, ні бійок тому, що всіх змалку навчають, що конфлікти це не погано та іноді навіть добре. Важливо, якщо вони виникають, то вирішувати їх шляхом перемовин"
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
    "Моя місія зараз – навчити тебе, як чути та бути почутим, щоб не втрачати друзів та не псувати стосунки з близькими через конфлікти"
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
    "Як думаєш Медіатор це \n\n1. Прилад для гри на гітарі \n2. Особа, яка проводить медіацію \n3. Обидва варіанти",
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
      "Так, є таке, такий медіатор – це невеликий плоский пристрій для гри на гітарі та деяких інших струнних інструментах. Але не про нього ми будемо з тобою спілкуватися. Обери інший варіант відповіді"
    );
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
      "Супер! Але дозволь я тобі спочатку розповім про правила. Вони тут ____"
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
    "Супер, ти молодець! Приємно з тобою мати справу ☺\n\nНу що, почнемо 😉"
  );
  await bot.sendMessageDelay(
    curUser,
    "Я знаю, що на вашій планеті теж існує медіація, а у твоїй країні навіть є Закон  про медіацію та медіаторів."
  );
  await bot.sendMessageDelay(
    curUser,
    "МЕДІАЦІЯ - це такі переговори, під час  яких медіатор допомагає  сторонам конфлікту почути один одного та порозумітися. Дуже важливо, що брати участь у цих переговорах можуть тільки ті, хто справді цього бажає. Тобто не можна примусити когось до участі в медіації.  Також важливо знати, що це секретні переговори. Це означає, що ніхто з учасників медіації не може розповідати іншим, що він почув або дізнався або про що домовились під час цих переговорів."
  );
  await bot.sendMessageDelay(
    curUser,
    "Забагато інформації? Будемо розбиратися."
  );
  await askQuestion(curUser);
}

async function showExplanation(curUser) {
  await bot.sendMessageDelay(
    curUser,

    await explanationText(curUser.questionNumber),
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
  if (curUser.questionNumber >= questionLength) await endQuiz(curUser);
  else {
    curUser.isInQuiz = true;
    const curComment = await getComment(curUser.questionNumber - 1);
    if (curComment[2]) {
      for (let i = 2; i < curComment.length; i++) {
        await bot.sendMessageDelay(curUser, curComment[i]);
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
    await bot.sendMessageDelay(curUser, "Вкажи варіант відповіді");
  } else if (res === "incorrect") {
    await bot.sendMessageDelay(
      curUser,
      await getComment(curUser.questionNumber, num)
    );
    if (!curUser.isOutQuiz) {
      if (curUser.curPoints[curUser.curPoints.length - 1] > 0)
        curUser.curPoints[curUser.curPoints.length - 1]--;
      if ([0, 4].includes(curUser.questionNumber))
        curUser.curPoints[curUser.curPoints.length - 1] = 20;
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
    await bot.sendMessageDelay(
      curUser,
      (
        await getComment(curUser.questionNumber, num)
      )[1],
      {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            // [
            //   {
            //     text: "Чому інші неправильні?",
            //     callback_data: `want${curUser.questionNumber + 1}`,
            //   },
            // ],
            [
              {
                text: "Зрозуміло",
                callback_data: `ok${curUser.questionNumber + 1}`,
              },
            ],
          ],
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
    "Отже, ми з тобою дізнались про медіацію та медіатора. Залишилось розкрити тобі найголовніший секрет. Магія медіації відбувається, коли сторонам вдалося знайти рішення, яким вони задоволені. Тоді кожен з них є переможцем",
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
      `Вітаю! Набрано: ${curUser.points}, балів`
    );
    await bot.sendMessageDelay(
      curUser,
      `Переможці квесту, які отримують призи будуть визначені першого числа наступного місяця відповідно до правил (сделать активной ссілкой)`
    );
    await afterQuiz(curUser);
  } else {
    await bot.sendMessageDelay(
      curUser,
      `Напоминаю, что как результат учитывается только первое прохождение)`
    );
  }
  // curUser.questionNumber = 0;
  // curUser.isInQuiz = false; tut
  // curUser.isOutQuiz = true;
}

async function afterQuiz(curUser) {
  await bot.sendMessageDelay(
    curUser,
    `А зараз пропоную повернутися до мого імені.`
  );
  await bot.sendMessageDelay(
    curUser,
    `Підсумуємо - воно має бути вигаданим і відображати мої властивості:`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я вмію уважно слухати, наче мати чарівні вуха, щоб вірно зрозуміти кожного.`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я майстерно розмовляю,  і при цьому вмію тримати язик за зубами і не розповідаю іншим про те що дізнався від сторін конфлікту.`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я вміло керую медіацією, наче диригент, ось і тут є чарівна паличка, але не підказую, яке рішення краще та не приймаю його.`
  );
  await bot.sendMessageDelay(
    curUser,
    `Я намагаюсь розуміти почуття та потреби кожного в конфлікті. `
  );
  await bot.sendMessageDelay(
    curUser,
    `Я, однаково доброзичливо ставлюсь до всіх сторін конфлікту, не оцінюю та засуджую їх.  `
  );
  await bot.sendMessageDelay(
    curUser,
    `Отже, ми підсумували і саме час почути яке ім’я ти меня придумав. `
  );

  await addName(curUser);
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
