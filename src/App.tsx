import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Login } from "./pages";
import styles from "./App.module.scss";
import TestsContextProvider from "./utils/contexts/TestsContext";
import AuthContextProvider from "./utils/auth/AuthContext";
import PrivateRoute from "./utils/auth/PrivateRoute";

const App = () => {
  return (
    <div className={styles.container}>
      <Router>
        <AuthContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
          <TestsContextProvider>
            <Routes>
              <Route path="/" element={<PrivateRoute component={Home} />} />
            </Routes>
          </TestsContextProvider>
        </AuthContextProvider>
      </Router>
    </div>
  );
};

export default App;
