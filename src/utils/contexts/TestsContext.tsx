import { createContext, useEffect, useReducer } from "react";
import { TEST_ACTION, TEST_ACTION_TYPES } from "../actions";
import { SAMPLE_TEST } from "../constants";
import { IQuestionWithID, ITest, ITestStatus } from "../interfaces";
import TestReducer from "../reducers/TestReducer";
import axios from "axios";
import { AuthContext } from "../auth/AuthContext";
import { useContext } from "react";
import { useState } from "react";
import { API_TESTS } from "../api";

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
  globalTest: {} as any,
  test: {} as any,
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
  setTestId: (testId: string) => void;
}>({
  state: defaultTestContext,
  dispatch: () => {},
  setTestId: () => {},
});

const TestsContextProvider: React.FC<ITestProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(TestReducer, defaultTestContext);
  const [testId, setTestId] = useState("");
  const { currentUser } = useContext(AuthContext);

  async function fetchTest(tempTestId: string) {
    console.log({ tempTestId });
    if (!tempTestId || tempTestId.length === 0) return;
    let test = await API_TESTS().get(`/test/student/${tempTestId}`);
    console.log({ data: test.data });
    if (test?.data) {
      dispatch({
        type: TEST_ACTION_TYPES.INITIALIZE_QUESTIONS,
        payload: test.data,
      });
    }
  }

  useEffect(() => {
    console.log({ testId });
    if (currentUser?.id && testId.length) {
      fetchTest(testId);
    }
  }, [currentUser, testId]);

  return (
    <TestsContext.Provider value={{ state, dispatch, setTestId }}>
      {children}
    </TestsContext.Provider>
  );
};

export default TestsContextProvider;
