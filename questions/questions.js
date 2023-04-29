import fs from "fs";

let questions = JSON.parse(
  fs.readFileSync("./questions/questions.json").toString()
);

export async function questionText(questionNumber, category) {
  return questions[category][questionNumber].questionText;
}

export async function optionsText(curUser, category) {
  const curQuestion = questions[category][curUser.questionNumber];
  let output = "";
  if (!curUser.isOutQuiz) curUser.curPoints.push(curQuestion.options.length);
  for (let i = 0; i < curQuestion.options.length; i++) {
    output += `${i + 1}) ${curQuestion.options[i]}N`;
  }
  output += "NКакой ответ выберешь?";
  return output;
}

export async function optsOptions(questionNumber, category) {
  const len = questions[category][questionNumber].options.length;
  const res = [];
  for (let i = 1; i <= len; i++) {
    res.push({ text: `${i}` });
  }
  return res;
}

export async function checkAnswer(questionNumber, input, category) {
  if (
    parseInt(input) > 0 &&
    parseInt(input) <= questions[category][questionNumber].options.length
  ) {
    if (parseInt(input) === questions[category][questionNumber].correctAnswer)
      return "correct";
    else return "incorrect";
  } else return "problem";
}
