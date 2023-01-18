import clsx from "clsx";
import { IOption } from "../../utils/interfaces";
import { isValidUrl } from "../../utils/utils";
import { Button } from "..";
import arrowDown from "../../assets/icons/arrowDown.svg";
import styles from "./Question.module.scss";
import RenderWithLatex from "../RenderWithLatex/RenderWithLatex";

interface Props {
  question: any;
  index: number;
  language: string;
  onChangeValue: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userAnswer: string;
}

const Question: React.FC<Props> = ({
  index,
  question,
  language,
  onChangeValue,
  userAnswer,
}) => {
  return (
    <div id="container" className={styles.container}>
      {question && (
        <>
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
        </>
      )}
    </div>
  );
};

export default Question;
