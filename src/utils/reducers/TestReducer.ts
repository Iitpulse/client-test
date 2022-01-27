import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestsContext } from "../contexts/TestsContext";
import { flattenQuestions, shuffleQuestions } from "../utils";

export default function TestReducer(
  state: ITestsContext,
  action: TEST_ACTION
): ITestsContext {
  const { type, payload } = action;

  const { questions, currentQuestion, test } = state;

  switch (type) {
    case TEST_ACTION_TYPES.NEXT_QUESTION: {
      return {
        ...state,
        currentQuestion:
          currentQuestion < questions.length - 1
            ? currentQuestion + 1
            : currentQuestion,
      };
    }
    case TEST_ACTION_TYPES.PREVIOUS_QUESTION: {
      return {
        ...state,
        currentQuestion: currentQuestion > 0 ? payload - 1 : currentQuestion,
      };
    }
    case TEST_ACTION_TYPES.GO_TO_QUESTION: {
      return {
        ...state,
        currentQuestion: payload,
      };
    }
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
        questions: allQuestionsShuffled,
        status: {
          ...state.status,
          notVisitied: allQuestionsShuffled.length,
        },
      };
    }
    default: {
      return state;
    }
  }
}
