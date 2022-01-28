import { createContext, useEffect, useReducer } from "react";
import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { SAMPLE_TEST } from "../constants";
import { IQuestionWithID, ITest, ITestStatus } from "../interfaces";
import TestReducer from "../reducers/TestReducer";

export interface ITestsContext {
  globalTest: ITest | null;
  test?: ITest | null;
  status: ITestStatus;
  currentQuestion: number;
  currentSection: number;
  currentSubSection: number;
  questions: Array<IQuestionWithID>;
}

interface ITestProviderProps {
  children: React.ReactNode;
}

const defaultTestContext = {
  globalTest: SAMPLE_TEST,
  test: SAMPLE_TEST,
  status: {
    notVisited: [],
    notAnswered: [],
    answered: [],
    markedForReview: [],
    answeredAndMarkedForReview: [],
  },
  currentQuestion: 0,
  currentSection: 0,
  currentSubSection: 0,
  questions: [],
};

export const TestsContext = createContext<{
  state: ITestsContext;
  dispatch: React.Dispatch<TEST_ACTION>;
}>({
  state: defaultTestContext,
  dispatch: () => {},
});

const TestsContextProvider: React.FC<ITestProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(TestReducer, defaultTestContext);

  useEffect(() => {
    dispatch({
      type: TEST_ACTION_TYPES.INITIALIZE_QUESTIONS,
      payload: null,
    });
  }, []);

  return (
    <TestsContext.Provider value={{ state, dispatch }}>
      {children}
    </TestsContext.Provider>
  );
};

export default TestsContextProvider;
