import { IQuestionWithID, ITest } from "./interfaces";

export function isValidUrl(str: string): boolean {
  let pattern = new RegExp(
    "^((ft|htt)ps?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name and extension
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?" + // port
      "(\\/[-a-z\\d%@_.~+&:]*)*" + // path
      "(\\?[;&a-z\\d%@_.,~+&:=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return pattern.test(str);
}

export function shuffleQuestions(ques: Array<IQuestionWithID>) {
  let currentIndex = ques.length,
    temporaryValue,
    randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = ques[currentIndex];
    ques[currentIndex] = ques[randomIndex];
    ques[randomIndex] = temporaryValue;
  }

  return ques;
}

export function flattenQuestions(test: ITest): Array<IQuestionWithID> {
  let questions: Array<IQuestionWithID> = [];

  console.log("inner", test);

  test.sections.forEach((section) => {
    section.subSections.forEach((subSection) => {
      console.log({ some: subSection.questions });
      questions = questions.concat(
        Object.values(subSection.questions).map((question, i) => ({
          ...question,
          en: question.en,
          hi: question.hi,
          sectionId: section.id,
          subSectionId: subSection.id,
          selectedOptions: [],
          status: {
            status: "notVisited",
            visitedAt: null,
            answeredAt: null,
            answeredAndMarkedForReviewAt: null,
            markedForReviewAt: null,
          },
        }))
      );
      console.log({ questions });
    });
  });

  return questions;
}

export function splitAndKeepDelimiters(
  str: any,
  separator: any,
  method = "seperate"
) {
  function splitAndKeep(strValue: string, sep: any, method = "seperate") {
    return strValue
      .split(sep)
      .reduce((acc, cur) => {
        return [...acc, cur, sep];
      }, [] as string[])
      .slice(0, -1);
  }

  if (Array.isArray(separator)) {
    let parts = splitAndKeep(str, separator[0], method);
    for (let i = 1; i < separator.length; i++) {
      let partsTemp = parts;
      parts = [];
      for (let p = 0; p < partsTemp.length; p++) {
        parts = parts.concat(splitAndKeep(partsTemp[p], separator[i], method));
      }
    }
    return parts;
  } else {
    return splitAndKeep(str, separator, method);
  }
}
