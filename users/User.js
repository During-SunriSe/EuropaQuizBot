class User {
  telegramId;
  username;
  name;
  age;
  language = "";
  category = 0;
  questionNumber = 0;
  curPoints = [];
  points = 0;
  isLanguageChoosing = false;
  isNameWriting = false;
  isAgeWriting = false;
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
