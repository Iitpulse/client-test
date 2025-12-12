import clsx from "clsx";
import { IOption } from "../../utils/interfaces";
import { isValidUrl } from "../../utils/utils";
import arrowDown from "../../assets/icons/arrowDown.svg";
import styles from "./Question.module.scss";
import RenderWithLatex from "../RenderWithLatex/RenderWithLatex";
import { memo, useEffect, useState } from "react";
import { TEST_ACTION_TYPES } from "src/utils/actions";
import { TIME_INTERVAL } from "src/utils/constants";

interface Props {
  question: any;
  id: string;
  selectedOptions: Array<string>;
  type: "single" | "multiple";
  index: number;
  language: string;
  setTimeTakenAllQuestions: any;
  timeTakenInSeconds: number;
  onClickOption: (option: string) => void;
}

const QuestionObjective: React.FC<Props> = ({
  index,
  question,
  id,
  selectedOptions,
  type,
  onClickOption,
  timeTakenInSeconds,
  setTimeTakenAllQuestions,
  language,
}) => {
  // handle timeTakenInSeconds using time intervals
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTakenAllQuestions((curr: any) => ({
        ...curr,
        [id]:
          curr[id] >= 0
            ? Math.round((curr[id] + TIME_INTERVAL / 1000) * 100) / 100
            : 0,
      }));
    }, TIME_INTERVAL);
    return () => {
      clearInterval(interval);
    };
  }, [id]);

  console.log("Rendering again", { question, id });

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

      <ul className={styles.options}>
        {question[language].options?.map((option: IOption, i: number) => (
          <li
            key={`${option.id}-${i}`}
            className={clsx(
              styles.option,
              selectedOptions?.includes(option.id) && styles.selected
            )}
          >
            <input
              type={type === "single" ? "radio" : "checkbox"}
              name="options"
              id={option?.id.toString()}
              onChange={() => onClickOption(option.id)}
              checked={selectedOptions?.includes(option.id)}
            />
            <label
              htmlFor={option.id.toString()}
              // onClick={() => onClickOption(option)}
            >
              {isValidUrl(option.value) ? (
                <img src={option.value} alt="option" />
              ) : (
                <RenderWithLatex quillString={option.value} />
              )}
            </label>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: "1rem" }} className={styles.buttonContainer}>
        <a id="bottom" href="#top">
          <img src={arrowDown} alt="Arrow Up" />
        </a>
      </div>
    </div>
  );
};

export default memo(QuestionObjective);
