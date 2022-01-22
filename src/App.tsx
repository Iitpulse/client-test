import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "./pages";
import styles from "./App.module.scss";

const App = () => {
  return (
    <div className={styles.container}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
