import { createContext, useState, useEffect } from "react";
import { SAMPLE_TEST } from "../constants";
import { IQuestion, ITest, ITestStatus } from "../interfaces";
import { flattenQuestions } from "../utils";

interface ITestsContext {
  globalTest: ITest | null;
  test?: ITest | null;
  setTest: (test: ITest | null) => void;
  status: ITestStatus;
  currentQuestion: number;
  currentSection: number;
  currentSubSection: number;
  questions: Array<IQuestion>;
  handleChangeCurrentQuestion: (val: number) => void;
}

interface ITestProviderProps {
  children: React.ReactNode;
}

const defaultTestContext = {
  globalTest: SAMPLE_TEST,
  test: SAMPLE_TEST,
  setTest: () => {},
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
  handleChangeCurrentQuestion: () => {},
};

export const TestsContext = createContext<ITestsContext>(defaultTestContext);

const TestsContextProvider: React.FC<ITestProviderProps> = ({ children }) => {
  const [globalTest, setGlobalTest] = useState<ITest | null>(SAMPLE_TEST);
  const [test, setTest] = useState<ITest | null>();
  const [status, setStatus] = useState<ITestStatus>(defaultTestContext.status);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [currentSubSection, setCurrentSubSection] = useState<number>(0);
  const [questions, setQuestions] = useState<Array<IQuestion>>([]);

  useEffect(() => {
    function shuffleQuestions(ques: Array<IQuestion>) {
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

    if (globalTest) {
      setTest(globalTest);
      let allQuestionsFromTest = flattenQuestions(globalTest);
      setQuestions(shuffleQuestions(allQuestionsFromTest));
    }
  }, [globalTest]);

  function handleChangeCurrentQuestion(val: number) {
    setCurrentQuestion(val);
  }

  return (
    <TestsContext.Provider
      value={{
        globalTest,
        test,
        setTest,
        status,
        currentQuestion,
        currentSection,
        currentSubSection,
        questions,
        handleChangeCurrentQuestion,
      }}
    >
      {children}
    </TestsContext.Provider>
  );
};

export default TestsContextProvider;
