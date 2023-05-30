import fs from "fs";

let questions = JSON.parse(
  fs.readFileSync("./questions/questions.json").toString()
);

export const questionLength = questions.length;

export async function questionText(questionNumber) {
  return questions[questionNumber].questionText;
}

export async function optionsText(curUser) {
  const curQuestion = questions[curUser.questionNumber];
  let output = "";
  if (!curUser.isOutQuiz) curUser.curPoints.push(curQuestion.options.length);
  for (let i = 0; i < curQuestion.options.length; i++) {
    output += `${i + 1}. ${curQuestion.options[i]}\n`;
  }
  return output;
}

export async function optsOptions(questionNumber) {
  const len = questions[questionNumber].options.length;
  const res = [];
  for (let i = 1; i <= len; i++) {
    res.push({ text: `${i}` });
  }
  return res;
}

export async function checkAnswer(questionNumber, input) {
  if (
    parseInt(input) > 0 &&
    parseInt(input) <= questions[questionNumber].options.length
  ) {
    if (parseInt(input) === questions[questionNumber].correctAnswer)
      return "correct " + input;
    else return "incorrect " + input;
  } else return "problem";
}

export async function explanationText(questionNumber) {
  const curQuestion = questions[questionNumber - 1];
  let output = "";
  for (let i = 0; i < curQuestion.explanation.length; i++) {
    output += `${i + 1}. ${curQuestion.explanation[i]}\n`;
  }
  return output;
}

export async function getComment(questionNumber, answerNumber) {
  return questions[questionNumber].comment[answerNumber - 1];
}

getComment(0, 2);
