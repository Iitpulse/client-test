import { createContext, useState } from "react";
import { SAMPLE_TEST } from "../constants";
import { ITest } from "../interfaces";

interface ITestsContext {
  test?: ITest | null;
  userTest: ITest | null;
  setUserTest: (test: ITest | null) => void;
}

interface ITestProviderProps {
  children: React.ReactNode;
}

const defaultTestContext = {
  test: SAMPLE_TEST,
  userTest: SAMPLE_TEST,
  setUserTest: () => {},
};

export const TestsContext = createContext<ITestsContext>(defaultTestContext);

const TestsContextProvider: React.FC<ITestProviderProps> = ({ children }) => {
  const [test, setTest] = useState<ITest | null>(SAMPLE_TEST);
  const [userTest, setUserTest] = useState<ITest | null>(SAMPLE_TEST);

  return (
    <TestsContext.Provider value={{ test, userTest, setUserTest }}>
      {children}
    </TestsContext.Provider>
  );
};

export default TestsContextProvider;
