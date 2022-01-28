import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestsContext } from "../contexts/TestsContext";
import { IOption, IQuestionWithID } from "../interfaces";
import { flattenQuestions, shuffleQuestions } from "../utils";

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
      const allQuestionsExtracted = test ? flattenQuestions(test) : questions;
      const allQuestionsShuffled = shuffleQuestions(allQuestionsExtracted);
      return {
        ...state,
        questions: allQuestionsShuffled.map((question, idx) => {
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
          notVisited: allQuestionsShuffled
            .map((question) => question.id)
            .filter((_, i) => i !== 0),
          notAnswered: [allQuestionsShuffled[0].id],
        },
      };
    }
    case TEST_ACTION_TYPES.NEXT_QUESTION: {
      const nextIdx =
        currentQuestion < questions.length - 1 ? payload + 1 : payload;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: !questionVisited
          ? markQuestionWithStatus(questions, nextIdx, "notAnswered")
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
      const nextIdx = currentQuestion > 0 ? payload - 1 : currentQuestion;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: !questionVisited
          ? markQuestionWithStatus(questions, nextIdx, "notAnswered")
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
      let questionVisited = isQuestionVisited(questions[payload]);
      return {
        ...state,
        currentQuestion: payload,
        questions:
          !questionVisited && payload !== currentQuestion
            ? markQuestionWithStatus(questions, payload, "notAnswered")
            : questions,
        status: {
          ...state.status,
          notVisited:
            !questionVisited && payload !== currentQuestion
              ? state.status.notVisited.filter(
                  (id) => id !== questions[payload].id
                )
              : state.status.notVisited,
          notAnswered:
            !questionVisited && payload !== currentQuestion
              ? uniqueValuesOnly([
                  ...state.status.notAnswered,
                  questions[payload].id,
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
            payload.selectedOption
          ),
          nextIdx,
          nextIdx === payload.currentQuestion &&
            payload.currentQuestion === questions.length - 1
            ? "answered"
            : "notAnswered"
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
        currentQuestion < questions.length - 1 ? payload + 1 : payload;
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: markQuestionWithStatus(
          markQuestionWithStatus(questions, currentQuestion, "markedForReview"),
          nextIdx,
          nextIdx === questions.length - 1 ? "markedForReview" : "notAnswered"
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
                    (id) => id !== questions[payload].id
                  ),
                  questions[nextIdx].id,
                ])
              : state.status.notAnswered.filter(
                  (id) => id !== questions[payload].id
                ),
          answered: state.status.answered.filter(
            (id) => id !== questions[payload].id
          ),
          markedForReview: uniqueValuesOnly([
            ...state.status.markedForReview,
            questions[payload].id,
          ]),
        },
      };
    }
    case TEST_ACTION_TYPES.SAVE_AND_MARK_FOR_REVIEW: {
      const nextIdx =
        payload.currentQuestion < questions.length - 1
          ? payload.currentQuestion + 1
          : payload.currentQuestion;
      console.log({ cq: payload.currentQuestion, nextIdx });
      let questionVisited = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: markQuestionWithStatus(
          markQuestionWithStatus(
            questions,
            currentQuestion,
            "answeredAndMarkedForReview",
            payload.selectedOption
          ),
          nextIdx,
          nextIdx === questions.length - 1
            ? "answeredAndMarkedForReview"
            : "notAnswered"
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
            ? payload.currentQuestion === nextIdx
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
    default: {
      return state;
    }
  }
}

function isQuestionVisited(question: IQuestionWithID): boolean {
  return question.status.status !== "notVisited";
}

function markQuestionWithStatus(
  questions: Array<IQuestionWithID>,
  qIdx: number,
  status: string,
  selectedOption?: IOption
): Array<IQuestionWithID> {
  return questions.map((question, index) => {
    if (index === qIdx) {
      return {
        ...question,
        status: {
          ...question.status,
          status,
          visitedAt: question.status.visitedAt || new Date().toISOString(),
          answeredAt:
            selectedOption &&
            !question.status.answeredAt &&
            status === "answered"
              ? new Date().toISOString()
              : question.status.answeredAt,
          answeredAndMarkedForReviewAt:
            selectedOption &&
            !question.status.answeredAndMarkedForReviewAt &&
            status === "answeredAndMarkedForReview"
              ? new Date().toISOString()
              : question.status.answeredAndMarkedForReviewAt,
          markedForReviewAt:
            !question.status.markedForReviewAt && status === "markedForReview"
              ? new Date().toISOString()
              : question.status.markedForReviewAt,
        },
        selectedOption: selectedOption || question.selectedOption,
      };
    }
    return question;
  });
}

function uniqueValuesOnly(arr: Array<any>) {
  return [...new Set(arr)];
}
