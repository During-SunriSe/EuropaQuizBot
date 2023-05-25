class User {
  telegramId;
  username;
  name;
  age;
  gender = "";
  category = 0;
  questionNumber = 0;
  curPoints = [];
  points = 0;
  isGenderChoosing = false;
  isNameWriting = false;
  isAgeWriting = false;
  firstQuestionAsking = false;
  whatIsForgotten = false;
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
