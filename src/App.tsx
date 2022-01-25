import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "./pages";
import styles from "./App.module.scss";
import TestsContextProvider from "./utils/contexts/TestsContext";

const App = () => {
  return (
    <div className={styles.container}>
      <TestsContextProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Router>
      </TestsContextProvider>
    </div>
  );
};

export default App;
