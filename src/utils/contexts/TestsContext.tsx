import { createContext, useState, useEffect } from "react";
import { SAMPLE_TEST } from "../constants";
import { ITest, ITestStatus } from "../interfaces";

interface ITestsContext {
  globalTest: ITest | null;
  test?: ITest | null;
  setTest: (test: ITest | null) => void;
  status: ITestStatus;
  currentQuestion: number;
  currentSection: number;
  currentSubSection: number;
}

interface ITestProviderProps {
  children: React.ReactNode;
}

const defaultTestContext = {
  globalTest: SAMPLE_TEST,
  userTest: SAMPLE_TEST,
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
};

export const TestsContext = createContext<ITestsContext>(defaultTestContext);

const TestsContextProvider: React.FC<ITestProviderProps> = ({ children }) => {
  const [globalTest, setGlobalTest] = useState<ITest | null>(SAMPLE_TEST);
  const [test, setTest] = useState<ITest | null>();
  const [status, setStatus] = useState<ITestStatus>(defaultTestContext.status);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [currentSubSection, setCurrentSubSection] = useState<number>(0);

  useEffect(() => {
    function shuffleQuestions(tst: ITest) {
      let currentIndex = 0,
        temporaryValue,
        randomIndex;

      tst.sections.forEach((section, sectionIdx) => {
        section.subSections.forEach((subSection, subSectionIdx) => {
          currentIndex = subSection.questions.length;

          while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue =
              tst.sections[sectionIdx].subSections[subSectionIdx].questions[
                currentIndex
              ];
            tst.sections[sectionIdx].subSections[subSectionIdx].questions[
              currentIndex
            ] =
              tst.sections[sectionIdx].subSections[subSectionIdx].questions[
                randomIndex
              ];
            tst.sections[sectionIdx].subSections[subSectionIdx].questions[
              randomIndex
            ] = temporaryValue;
          }
        });
      });
      return tst;
    }

    if (globalTest) {
      console.log({ globalTest });
      setTest(shuffleQuestions(globalTest));
    }
  }, [globalTest]);

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
      }}
    >
      {children}
    </TestsContext.Provider>
  );
};

export default TestsContextProvider;
