class User {
  telegramId;
  username;
  name;
  age;
  language = "";
  gender = "";
  category = 0;
  questionNumber = 0;
  curPoints = [];
  points = 0;
  botName = "";
  isLanguageChoosing = false;
  isNameWriting = false;
  isAgeWriting = false;
  firstQuestionAsking = false;
  whatIsForgotten = false;
  isBotNameWriting = false;
  isMediatorAnswerWriting = false;
  isInQuiz = false;
  isOutQuiz = false;
  botIsTexting = false;
  sendedFile;
  constructor(telegramId, username) {
    this.telegramId = telegramId;
    this.username = username;
  }
}

export default User;
