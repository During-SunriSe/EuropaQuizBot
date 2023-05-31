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
  if (!curUser.isOutQuiz) {
    if (questions[curUser.questionNumber].correctAnswer !== 0)
      curUser.curPoints.push(curQuestion.options.length);
    else if ([6, 7].includes(curUser.questionNumber)) curUser.curPoints.push(5);
    else curUser.curPoints.push(20);
  }
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
    if (questions[questionNumber].correctAnswer === 0)
      return "correct " + input;
    if (parseInt(input) === questions[questionNumber].correctAnswer)
      return "correct " + input;
    else return "incorrect " + input;
  } else return "problem";
}

export async function explanationText(questionNumber) {
  const curQuestion = questions[questionNumber - 1];
  let output = "";
  for (let i = 0; i < curQuestion.explanation.length; i++) {
    output += `${curQuestion.explanation[i]}\n`;
  }
  return output;
}

export async function getComment(questionNumber, answerNumber) {
  if (!answerNumber) {
    const comments = questions[questionNumber]?.extraComment;
    if (comments) return comments;
    else return [];
  }
  return questions[questionNumber].comment[answerNumber - 1];
}
