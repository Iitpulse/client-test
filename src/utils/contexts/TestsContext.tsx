import { createContext } from "react";
import { ITest } from "../interfaces";

interface ITestsContext {
  test?: ITest | null;
}

interface ITestProviderProps {
  children: React.ReactNode;
}

const defaultTestContext = {
  test: null,
};

export const TestsContext = createContext<ITestsContext>(defaultTestContext);

const TestsContextProvider: React.FC<ITestProviderProps> = ({ children }) => {
  return <TestsContext.Provider value={{}}>{children}</TestsContext.Provider>;
};

export default TestsContextProvider;
