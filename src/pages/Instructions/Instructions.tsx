import React, { useState } from "react";
import styles from "./Instructions.module.scss";
import logo from "../../assets/images/logo.svg";
import { Button, Header } from "src/components";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  ANSWERING_A_QUESTION_INSTRUCTIONS,
  GENERAL_INSTRUCTIONS,
  INSTRUCTIONS_CONFIRMATION,
  INSTRUCTIONS_WARNING,
  NAVGATING_TO_QUESTION_INSTRUCTIONS,
  NAVIGATING_THROUGH_SECTIONS_INSTRUCTIONS,
} from "src/utils/constants";
import { InstructionType } from "src/utils/interfaces";

const Instructions = () => {
  const navigate = useNavigate();
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [locale, setLocale] = useState<string>("en");

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
    if (!confirmCheck) {
      return alert("Please confirm that you have read the instructions");
    }
    handleScreen();
    navigate("/");
  }

  function handleChangeLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    setLocale(e.target.value);
  }

  return (
    <div className={styles.container}>
      <Header
        testInfoLeftComp={<h3>GENERAL INSTRUCTIONS</h3>}
        rightComp={<p style={{ marginLeft: "auto" }}>Test</p>}
        classes={[styles.header]}
        onChangeLanguage={handleChangeLanguage}
      />
      <section className={styles.main}>
        <h3>Please read the instructions carefully</h3>
        <div className={clsx(styles.instructionSection)}>
          <h4>General Instructions:</h4>
          <InstructionsList
            instructions={GENERAL_INSTRUCTIONS}
            locale={locale}
          />
        </div>
        <div className={clsx(styles.instructionSection)}>
          <h4>Navigating to a Question</h4>
          <InstructionsList
            instructions={NAVGATING_TO_QUESTION_INSTRUCTIONS}
            locale={locale}
          />
        </div>
        <div className={clsx(styles.instructionSection)}>
          <h4>Answering a Question</h4>
          <InstructionsList
            instructions={ANSWERING_A_QUESTION_INSTRUCTIONS}
            locale={locale}
          />
        </div>
        <div className={clsx(styles.instructionSection)}>
          <h4>Navigation through sections</h4>
          <InstructionsList
            instructions={NAVIGATING_THROUGH_SECTIONS_INSTRUCTIONS}
            locale={locale}
          />
        </div>
        <hr />
        <p className={styles.warning}>
          {INSTRUCTIONS_WARNING[locale] || INSTRUCTIONS_WARNING.en}
        </p>
        <hr />
        <label>
          <input
            style={{ marginTop: "2rem" }}
            type="checkbox"
            checked={confirmCheck}
            placeholder="Agree"
            onChange={(e) => setConfirmCheck(e.target.checked)}
          />
          &nbsp;&nbsp;
          {INSTRUCTIONS_CONFIRMATION[locale] || INSTRUCTIONS_CONFIRMATION.en}
        </label>
        <Button
          onClick={handleClickContinue}
          classes={[styles.continueBtn]}
          color="warning"
          disabled={!confirmCheck}
        >
          PROCEED
        </Button>
      </section>
    </div>
  );
};

export default Instructions;

type InstructionsListProps = {
  instructions: Array<InstructionType>;
  locale: string;
};

const InstructionsList: React.FC<InstructionsListProps> = ({
  instructions,
  locale = "en",
}) => {
  return (
    <ol>
      {instructions.map((instruction, i) =>
        instruction.children ? (
          <li>
            {instruction.content[locale] || instruction.content.en}
            <InstructionsList
              instructions={instruction.children}
              locale={locale}
            />
          </li>
        ) : (
          <li> {instruction.content[locale] || instruction.content.en}</li>
        )
      )}
    </ol>
  );
};
