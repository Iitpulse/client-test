import clsx from "clsx";
import { IOption } from "../../utils/interfaces";
import { isValidUrl } from "../../utils/utils";
import { Button } from "..";
import arrowDown from "../../assets/icons/arrowDown.svg";
import styles from "./Question.module.scss";
import RenderWithLatex from "../RenderWithLatex/RenderWithLatex";
import { memo, useCallback, useContext, useEffect, useState } from "react";
import { TestsContext } from "src/utils/contexts/TestsContext";
import { TEST_ACTION_TYPES } from "src/utils/actions";

interface Props {
  question: any;
  id: string;
  index: number;
  language: string;
  setTimeTakenAllQuestions: any;
  timeTakenInSeconds: number;
  onChangeValue: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userAnswer: string;
}

const QuestionInteger: React.FC<Props> = ({
  index,
  question,
  id,
  language,
  onChangeValue,
  setTimeTakenAllQuestions,
  timeTakenInSeconds,
  userAnswer,
}) => {
  const [timeTaken, setTimeTaken] = useState(timeTakenInSeconds || 0);

  // handle timeTakenInSeconds using time intervals

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTaken((curr: number) => curr + 1);
      setTimeTakenAllQuestions((curr: any) => ({
        ...curr,
        [id]: timeTaken + 1,
      }));
    }, 1000);
    return () => {
      // dispatch event to update timeTakenInSeconds
      clearInterval(interval);
    };
  }, [question, id]);

  return (
    <div id="container" className={styles.container}>
      <div className={styles.header}>
        <h3>Question {index + 1}</h3>
        <a id="top" href="#bottom">
          <img src={arrowDown} alt="Arrow Down" />
        </a>
      </div>
      <div className={styles.divider}></div>
      <div className={styles.main}>
        {isValidUrl(question) ? (
          <img src={question} alt="question" />
        ) : (
          <RenderWithLatex quillString={question[language].question} />
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "2rem 0",
        }}
        className={styles.numerical}
      >
        <p style={{ color: "grey", marginBottom: "0.7rem" }}>Answer</p>
        <input
          style={{ padding: "0.5rem" }}
          title="answer"
          type="number"
          onChange={onChangeValue}
          value={userAnswer}
          name="numerical"
          id="numerical"
        />
      </div>
      <div style={{ marginTop: "1rem" }} className={styles.buttonContainer}>
        <a id="bottom" href="#top">
          <img src={arrowDown} alt="Arrow Up" />
        </a>
      </div>
    </div>
  );
};

export default memo(QuestionInteger);
