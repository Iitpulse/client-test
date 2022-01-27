import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestsContext } from "../contexts/TestsContext";
import { IQuestionWithID } from "../interfaces";
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
              },
            };
          }
          return question;
        }),
        status: {
          ...state.status,
          notVisitied: allQuestionsShuffled.length,
        },
      };
    }
    case TEST_ACTION_TYPES.NEXT_QUESTION: {
      const nextIdx =
        currentQuestion < questions.length - 1 ? payload + 1 : payload;
      let questionVisisted = isQuestionVisited(questions[nextIdx]);
      return {
        ...state,
        currentQuestion: nextIdx,
        questions: !questionVisisted
          ? markQuestionVisited(questions, nextIdx)
          : questions,
        status: {
          ...state.status,
          notVisitied:
            !questionVisisted && nextIdx !== currentQuestion
              ? state.status.notVisitied - 1
              : state.status.notVisitied,
          notAnswered:
            !questionVisisted && nextIdx !== currentQuestion
              ? state.status.notAnswered + 1
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
          ? markQuestionVisited(questions, nextIdx)
          : questions,
        status: {
          ...state.status,
          notVisitied:
            !questionVisited && nextIdx !== currentQuestion
              ? state.status.notVisitied - 1
              : state.status.notVisitied,
          notAnswered:
            !questionVisited && nextIdx !== currentQuestion
              ? state.status.notAnswered + 1
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
            ? markQuestionVisited(questions, payload)
            : questions,
        status: {
          ...state.status,
          notVisitied:
            !questionVisited && payload !== currentQuestion
              ? state.status.notVisitied - 1
              : state.status.notVisitied,
          notAnswered:
            !questionVisited && payload !== currentQuestion
              ? state.status.notAnswered + 1
              : state.status.notAnswered,
        },
      };
    }
    default: {
      return state;
    }
  }
}

function isQuestionVisited(question: IQuestionWithID): boolean {
  switch (question.status.status) {
    case "notAnswered":
    case "answered":
    case "markedForReview":
    case "answeredAndMarkedForReview":
      return true;
    default:
      return false;
  }
}

function markQuestionVisited(
  questions: Array<IQuestionWithID>,
  qIdx: number
): Array<IQuestionWithID> {
  return questions.map((question, index) => {
    if (index === qIdx) {
      return {
        ...question,
        status: {
          ...question.status,
          status: "notAnswered",
        },
      };
    }
    return question;
  });
}
