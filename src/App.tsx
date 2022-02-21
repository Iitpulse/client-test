import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthWithURI, Home, Instructions, Login, Result } from "./pages";
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
              <Route path="/auth/:user/:testId" element={<AuthWithURI />} />
              <Route
                path="/instructions"
                element={<PrivateRoute component={Instructions} />}
              />
              <Route path="/" element={<PrivateRoute component={Home} />} />
              <Route
                path="/result"
                element={<PrivateRoute component={Result} />}
              />
            </Routes>
          </TestsContextProvider>
        </AuthContextProvider>
      </Router>
    </div>
  );
};

export default App;
