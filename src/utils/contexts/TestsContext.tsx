import { createContext, useState, useEffect, useReducer } from "react";
import { SAMPLE_TEST } from "../constants";
import { IQuestionWithID, ITest, ITestStatus } from "../interfaces";
import TestReducer from "../reducers/TestReducer";
import { flattenQuestions, shuffleQuestions } from "../utils";

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
    notVisitied: 0,
    notAnswered: 0,
    answered: 0,
    markedForReview: 0,
    answeredAndMarkedForReview: 0,
  },
  currentQuestion: 0,
  currentSection: 0,
  currentSubSection: 0,
  questions: [],
};

export const TestsContext = createContext<{
  state: ITestsContext;
  dispatch: React.Dispatch<any>;
}>({
  state: defaultTestContext,
  dispatch: () => {},
});

const TestsContextProvider: React.FC<ITestProviderProps> = ({ children }) => {
  // const [globalTest, setGlobalTest] = useState<ITest | null>(SAMPLE_TEST);
  // const [test, setTest] = useState<ITest | null>();
  // const [status, setStatus] = useState<ITestStatus>(defaultTestContext.status);
  // const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  // const [currentSection, setCurrentSection] = useState<number>(0);
  // const [currentSubSection, setCurrentSubSection] = useState<number>(0);
  // const [questions, setQuestions] = useState<Array<IQuestionWithID>>([]);

  const [state, dispatch] = useReducer(TestReducer, defaultTestContext);

  // useEffect(() => {
  //   if (globalTest) {
  //     setTest(globalTest);
  //     let allQuestionsFromTest = flattenQuestions(globalTest);
  //     setQuestions(shuffleQuestions(allQuestionsFromTest));
  //   }
  // }, [globalTest]);

  // function handleChangeCurrentQuestion(val: number) {
  //   setCurrentQuestion(val);
  // }

  return (
    <TestsContext.Provider value={{ state, dispatch }}>
      {children}
    </TestsContext.Provider>
  );
};

export default TestsContextProvider;
