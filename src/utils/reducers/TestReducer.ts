import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { ITestsContext } from "../contexts/TestsContext";

export default function TestReducer(state: ITestsContext, action: TEST_ACTION) {
  const { type, payload } = action;

  const { questions } = state;

  switch (type) {
    case TEST_ACTION_TYPES.NEXT_QUESTION: {
      return state;
    }
  }
}
