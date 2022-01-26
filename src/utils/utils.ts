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

  test.sections.forEach((section) => {
    section.subSections.forEach((subSection) => {
      questions = questions.concat(
        subSection.questions.map((question) => ({
          ...question,
          sectionId: section.id,
          subSectionId: subSection.id,
          status: {
            status: "notVisited",
            visitedAt: null,
            answeredAt: null,
            answeredAndMarkedForReviewAt: null,
            markedForReviewAt: null,
          },
        }))
      );
    });
  });

  return questions;
}
