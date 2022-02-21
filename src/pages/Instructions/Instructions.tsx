import React from "react";
import styles from "./Instructions.module.scss";
import logo from "../../assets/images/logo.svg";
import { Button } from "src/components";
import { useNavigate } from "react-router-dom";

const Instructions = () => {
  const navigate = useNavigate();

  function handleScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleClickContinue() {
    handleScreen();
    navigate("/");
  }

  return (
    <div className={styles.container}>
      <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
      </section>
      <section className={styles.main}>
        <h1>Instructions</h1>
        <p>Some instructions will appear here...</p>
        <Button onClick={handleClickContinue}>Continue</Button>
      </section>
    </div>
  );
};

export default Instructions;
