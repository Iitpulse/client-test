import { useEffect, useState } from "react";
import styles from "./Result.module.scss";
import logo from "../../assets/images/logo.svg";
import { TEST_SUBMITTED } from "src/utils/constants";
import { useNavigate } from "react-router-dom";

const Result = () => {
  const [timeTaken, setTimeTaken] = useState(5);

  const navigate = useNavigate();

  useEffect(() => {
    const isSubmitted = localStorage.getItem(TEST_SUBMITTED) === "true";
    if (!isSubmitted) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTaken((prevTimeTaken) => prevTimeTaken - 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (timeTaken < 1) {
      window.close();
    }
  });

  return (
    <div className={styles.container}>
      <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
      </section>
      <section className={styles.main}>
        <h1 style={{ lineHeight: "300%" }}>
          Thank you for submitting the test
        </h1>
        <p>This window will close in {timeTaken} sec</p>
      </section>
    </div>
  );
};

export default Result;
