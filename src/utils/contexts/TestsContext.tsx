import { createContext, useEffect, useReducer } from "react";
import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { SAMPLE_TEST } from "../constants";
import { IQuestionWithID, ITest, ITestStatus } from "../interfaces";
import TestReducer from "../reducers/TestReducer";
import axios from "axios";

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
    async function fetchTest() {
      let test = await axios.get(
        process.env.REACT_APP_TEST_API_URI
          ? `${process.env.REACT_APP_TEST_API_URI}/test/get`
          : "http://localhost:5002/test/get"
      );
      console.log({ data: test.data });
      if (test?.data) {
        dispatch({
          type: TEST_ACTION_TYPES.INITIALIZE_QUESTIONS,
          payload: test.data[0],
        });
      }
    }
    fetchTest();
  }, []);

  return (
    <TestsContext.Provider value={{ state, dispatch }}>
      {children}
    </TestsContext.Provider>
  );
};

export default TestsContextProvider;
