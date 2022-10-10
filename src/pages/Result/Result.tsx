import { useEffect, useState } from "react";
import styles from "./Result.module.scss";
import logo from "../../assets/images/logo.svg";

const Result = () => {
  const [result, setResult] = useState("");

  useEffect(() => {
    const res = localStorage.getItem("result");
    if (res) {
      setResult(res);
    }
  }, []);

  return (
    <div className={styles.container}>
      <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
      </section>
      <section className={styles.main}>
        <h1>Result</h1>
        <p>Total marks obtained: {result}</p>
      </section>
    </div>
  );
};

export default Result;
