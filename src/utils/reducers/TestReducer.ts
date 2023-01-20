import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestsContext } from "../contexts/TestsContext";
import { IOption, IQuestionWithID, ITest } from "../interfaces";
import { flattenQuestions, shuffleQuestions } from "../utils";
import axios from "axios";
import { API_TESTS } from "../api";

export default function TestReducer(
  state: ITestsContext,
  action: TEST_ACTION
): ITestsContext {
  const { type, payload } = action;

  const { questions, currentQuestion, test } = state;

  switch (type) {
    case TEST_ACTION_TYPES.FLATTEN_QUESTIONS: {
      return {
        ...state,
        questions: test ? flattenQuestions(test) : questions,
      };
    }
    case TEST_ACTION_TYPES.SHUFFLE_QUESTIONS: {
      return {
        ...state,
        questions: test ? shuffleQuestions(questions) : questions,
      };
    }
    case TEST_ACTION_TYPES.INITIALIZE_QUESTIONS: {
      const allQuestionsExtracted = payload
        ? flattenQuestions(payload)
        : questions;
      // const allQuestionsShuffled = shuffleQuestions(allQuestionsExtracted);
      return {
        ...state,
        test: payload,
        questions: allQuestionsExtracted.map((question, idx) => {
          if (idx === 0) {
            return {
              ...question,
              status: {
                ...question.status,
                status: "notAnswered",
                visitedAt: new Date().toISOString(),
              },
            };
          }
          return question;
        }),
        status: {
          ...state.status,
          notVisited: allQuestionsExtracted
            .map((question) => question.id)
            .filter((_, i) => i !== 0),
          notAnswered: [allQuestionsExtracted[0].id],
        },
      };
    }
    case TEST_ACTION_TYPES.NEXT_QUESTION: {
      const nextIdx =
        currentQuestion < questions.length - 1
          ? payload.currentQuestion + 1
          : payload.currentQuestion;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: !questionVisited
          ? markQuestionWithStatus(
              questions,
              nextIdx,
              "notAnswered",
              undefined,
              payload.timeTakenInSeconds
            )
          : questions,
        status: {
          ...state.status,
          notVisited:
            !questionVisited && nextIdx !== currentQuestion
              ? state.status.notVisited.filter(
                  (id) => id !== questions[nextIdx].id
                )
              : state.status.notVisited,
          notAnswered:
            !questionVisited && nextIdx !== currentQuestion
              ? uniqueValuesOnly([
                  ...state.status.notAnswered,
                  questions[nextIdx].id,
                ])
              : state.status.notAnswered,
        },
      };
    }
    case TEST_ACTION_TYPES.PREVIOUS_QUESTION: {
      const nextIdx =
        currentQuestion > 0 ? payload.currentQuestion - 1 : currentQuestion;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: !questionVisited
          ? markQuestionWithStatus(
              questions,
              nextIdx,
              "notAnswered",
              undefined,
              payload.timeTakenInSeconds
            )
          : questions,
        status: {
          ...state.status,
          notVisited:
            !questionVisited && nextIdx !== currentQuestion
              ? state.status.notVisited.filter(
                  (id) => id !== questions[nextIdx].id
                )
              : state.status.notVisited,
          notAnswered:
            !questionVisited && nextIdx !== currentQuestion
              ? uniqueValuesOnly([
                  ...state.status.notAnswered,
                  questions[nextIdx].id,
                ])
              : state.status.notAnswered,
        },
      };
    }
    case TEST_ACTION_TYPES.GO_TO_QUESTION: {
      let questionVisited = isQuestionVisited(
        questions[payload.currentQuestion]
      );
      return {
        ...state,
        currentQuestion: payload.currentQuestion,
        questions:
          !questionVisited && payload.currentQuestion !== currentQuestion
            ? markQuestionWithStatus(
                questions,
                payload.currentQuestion,
                "notAnswered",
                undefined,
                payload.timeTakenInSeconds
              )
            : questions,
        status: {
          ...state.status,
          notVisited:
            !questionVisited && payload.currentQuestion !== currentQuestion
              ? state.status.notVisited.filter(
                  (id) => id !== questions[payload.currentQuestion].id
                )
              : state.status.notVisited,
          notAnswered:
            !questionVisited && payload.currentQuestion !== currentQuestion
              ? uniqueValuesOnly([
                  ...state.status.notAnswered,
                  questions[payload.currentQuestion].id,
                ])
              : state.status.notAnswered,
        },
      };
    }
    case TEST_ACTION_TYPES.SAVE_AND_NEXT: {
      const nextIdx =
        currentQuestion < questions.length - 1
          ? payload.currentQuestion + 1
          : payload.currentQuestion;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: markQuestionWithStatus(
          markQuestionWithStatus(
            questions,
            currentQuestion,
            "answered",
            payload.selectedOption,
            payload.timeTakenInSeconds
          ),
          nextIdx,
          statusForNextQuestion(
            payload,
            nextIdx,
            questions,
            questionVisited,
            "answered",
            "notAnswered"
          ),
          undefined,
          questions[nextIdx].status.timeTakenInSeconds
        ),
        status: {
          ...state.status,
          notVisited:
            !questionVisited && nextIdx !== currentQuestion
              ? state.status.notVisited.filter(
                  (id) => id !== questions[nextIdx].id
                )
              : state.status.notVisited,
          notAnswered: !questionVisited
            ? isLastQuestion(payload, nextIdx, questions)
              ? state.status.notAnswered.filter(
                  (id) => id !== questions[payload.currentQuestion].id
                )
              : uniqueValuesOnly([
                  ...state.status.notAnswered.filter(
                    (id) => id !== questions[payload.currentQuestion].id
                  ),
                  questions[nextIdx].id,
                ])
            : state.status.notAnswered.filter(
                (id) => id !== questions[payload.currentQuestion].id
              ),
          answered: uniqueValuesOnly([
            ...state.status.answered,
            questions[payload.currentQuestion].id,
          ]),
          answeredAndMarkedForReview:
            state.status.answeredAndMarkedForReview.filter(
              (id) => id !== questions[payload.currentQuestion].id
            ),
        },
      };
    }
    case TEST_ACTION_TYPES.MARK_FOR_REVIEW_AND_NEXT: {
      const nextIdx =
        currentQuestion < questions.length - 1
          ? payload.currentQuestion + 1
          : payload.currentQuestion;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: markQuestionWithStatus(
          markQuestionWithStatus(
            questions,
            payload.currentQuestion,
            "markedForReview",
            undefined,
            payload.timeTakenInSeconds
          ),
          nextIdx,
          statusForNextQuestion(
            { currentQuestion: payload.currentQuestion },
            nextIdx,
            questions,
            questionVisited,
            "markedForReview",
            "notAnswered"
          ),
          undefined,
          questions[nextIdx].status.timeTakenInSeconds
        ),
        status: {
          ...state.status,
          notVisited:
            !questionVisited && nextIdx !== currentQuestion
              ? state.status.notVisited.filter(
                  (id) => id !== questions[nextIdx].id
                )
              : state.status.notVisited,
          notAnswered:
            !questionVisited && nextIdx !== currentQuestion
              ? uniqueValuesOnly([
                  ...state.status.notAnswered.filter(
                    (id) => id !== questions[payload.currentQuestion].id
                  ),
                  questions[nextIdx].id,
                ])
              : state.status.notAnswered.filter(
                  (id) => id !== questions[payload.currentQuestion].id
                ),
          answered: state.status.answered.filter(
            (id) => id !== questions[payload.currentQuestion].id
          ),
          markedForReview: uniqueValuesOnly([
            ...state.status.markedForReview,
            questions[payload.currentQuestion].id,
          ]),
        },
      };
    }
    case TEST_ACTION_TYPES.SAVE_AND_MARK_FOR_REVIEW: {
      const nextIdx =
        payload.currentQuestion < questions.length - 1
          ? payload.currentQuestion + 1
          : payload.currentQuestion;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: markQuestionWithStatus(
          markQuestionWithStatus(
            questions,
            currentQuestion,
            "answeredAndMarkedForReview",
            payload.selectedOption,
            payload.timeTakenInSeconds
          ),
          nextIdx,
          statusForNextQuestion(
            payload,
            nextIdx,
            questions,
            questionVisited,
            "answeredAndMarkedForReview",
            "notAnswered"
          ),
          undefined,
          questions[nextIdx].status.timeTakenInSeconds
        ),
        status: {
          ...state.status,
          notVisited:
            !questionVisited && nextIdx !== currentQuestion
              ? state.status.notVisited.filter(
                  (id) => id !== questions[nextIdx].id
                )
              : state.status.notVisited,
          notAnswered: !questionVisited
            ? isLastQuestion(payload, nextIdx, questions)
              ? state.status.notAnswered.filter(
                  (id) => id !== questions[nextIdx].id
                )
              : uniqueValuesOnly([
                  ...state.status.notAnswered.filter(
                    (id) => id !== questions[payload.currentQuestion].id
                  ),
                  questions[nextIdx].id,
                ])
            : state.status.notAnswered.filter(
                (id) => id !== questions[payload.currentQuestion].id
              ),
          answered: state.status.answered.filter(
            (id) => id !== questions[payload.currentQuestion].id
          ),
          markedForReview: state.status.markedForReview.filter(
            (id) => id !== questions[payload.currentQuestion].id
          ),
          answeredAndMarkedForReview: uniqueValuesOnly([
            ...state.status.answeredAndMarkedForReview,
            questions[payload.currentQuestion].id,
          ]),
        },
      };
    }
    case TEST_ACTION_TYPES.CLEAR_SELECTION: {
      return {
        ...state,
        questions: clearOptionSelection(questions, payload),
        status: {
          ...state.status,
          notAnswered: uniqueValuesOnly([...state.status.notAnswered, payload]),
          answered: state.status.answered.filter(
            (id) => id !== questions[payload].id
          ),
          answeredAndMarkedForReview:
            state.status.answeredAndMarkedForReview.filter(
              (id) => id !== questions[payload].id
            ),
          markedForReview: state.status.markedForReview.filter(
            (id) => id !== questions[payload].id
          ),
        },
      };
    }
    case TEST_ACTION_TYPES.UPDATE_TIME_TAKEN: {
      return {
        ...state,
        questions: updateQuestionTimeTaken(questions, payload),
      };
    }
    case TEST_ACTION_TYPES.SUBMIT_TEST: {
      let finalTest = {
        ...state.test,
        sections: state.test?.sections.map((section) => ({
          ...section,
          subSections: section.subSections.map((subSection) => ({
            ...subSection,
            questions: getSubSectionQuestions(
              section.id,
              subSection.id,
              questions
            ),
          })),
        })),
      };
      console.log({ finalTest });
      localStorage.setItem("test", JSON.stringify(finalTest));
      submitTest(payload, finalTest);
      return state;
    }
    default: {
      return state;
    }
  }
}

function getSubSectionQuestions(
  sectionId: string,
  subSectionId: string,
  questions: any
) {
  let qs: any = {};
  // for (let [key, value] of Object.entries(subSection.questions)) {
  //   qs[key] = questions.find((q: any) => q.subSectionId === subSectionId);
  // }
  questions.forEach((question: any) => {
    console.log(question);
    if (
      question.subSectionId === subSectionId &&
      question.sectionId === sectionId
    ) {
      qs[question.id] = question;
    }
  });

  console.log({ qs });

  return qs;
}

function updateQuestionTimeTaken(questions: any, payload: any) {
  return questions?.map((question: any) => {
    if (question.id === payload.id) {
      return {
        ...question,
        timeTakenInSeconds: payload.timeTakenInSeconds,
      };
    }
    return question;
  });
}

async function submitTest(payload: any, test: any) {
  console.log("first");
  if (!test) return;
  console.log("second");
  const testId = test.id;
  try {
    let res = await API_TESTS().post(`/test/submit`, {
      user: payload.user,
      test: {
        id: test.id,
        sections: test.sections,
        status: "submitted",
        validity: test.validity,
        createdAt: test.createdAt,
        modifiedAt: test.modifiedAt,
      },
    });
    alert("Submitted succesfully");
    localStorage.setItem("result", res.data.result.totalMarks);
    payload.cb();
    // console.log({ res });
    return;
  } catch (error: any) {
    console.log(error?.response);
    payload.cb(error?.response?.data?.message);
  }
}

function isQuestionVisited(question: IQuestionWithID): boolean {
  return question.status.status !== "notVisited";
}

function markQuestionWithStatus(
  questions: Array<IQuestionWithID>,
  qIdx: number,
  status: string,
  selectedOption?: IOption[] | number,
  timeTakenInSeconds: number = 0
): Array<IQuestionWithID> {
  console.log({ timeTakenInSeconds });
  return questions.map((question: any, index) => {
    if (index === qIdx) {
      return question.type === "single" || question.type === "multiple"
        ? {
            ...question,
            status: {
              ...question.status,
              status,
              timeTakenInSeconds,
            },
            selectedOptions: selectedOption
              ? uniqueValuesOnly(selectedOption as IOption[])
              : question.selectedOptions,
          }
        : {
            ...question,
            status: {
              ...question.status,
              status,
              timeTakenInSeconds,
            },
            enteredAnswer: selectedOption as number,
          };
    }
    return question;
  });
}

export function uniqueValuesOnly(arr: Array<any>) {
  return [...new Set(arr)];
}

function isLastQuestion(payload: any, nextIdx: number, questions: any) {
  return (
    nextIdx === payload.currentQuestion &&
    payload.currentQuestion === questions.length - 1
  );
}

function statusForNextQuestion(
  payload: any,
  nextIdx: number,
  questions: Array<IQuestionWithID>,
  isNextQuestionVisited: boolean,
  positiveStatus: string,
  negativeStatus: string
): string {
  return isLastQuestion(payload, nextIdx, questions)
    ? positiveStatus
    : isNextQuestionVisited
    ? questions[nextIdx].status.status
    : negativeStatus;
}

function clearOptionSelection(
  questions: Array<IQuestionWithID>,
  currentQuestion: number
) {
  return questions.map((question, i) => {
    if (i === currentQuestion) {
      return {
        ...question,
        status: {
          ...question.status,
          status: "notAnswered",
          timeTakenInSeconds: question.status.timeTakenInSeconds,
        },
        selectedOptions: [],
      };
    }
    return question;
  });
}
