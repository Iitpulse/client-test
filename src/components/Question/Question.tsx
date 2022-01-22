import clsx from "clsx";
import React, { useState } from "react";
import { IOption } from "../../utils/interfaces";
import { isValidUrl } from "../../utils/utils";
import styles from "./Question.module.scss";

interface Props {
  question: string;
  options: Array<IOption>;
  selectedOption: IOption | null;
  type: "mcq" | "numerical";
  index: number;
}

const Question: React.FC<Props> = ({
  index,
  question,
  options,
  selectedOption,
  type,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4>Question {index + 1}</h4>
      </div>
      <div className={styles.main}>
        {isValidUrl(question) ? (
          <img src={question} alt="question" />
        ) : (
          <p>{question}</p>
        )}
      </div>
      <ul className={styles.options}>
        {options.map((option, i) => (
          <li
            key={`${option.id}-${i}`}
            className={clsx(
              styles.option,
              selectedOption?.id === option.id && styles.selected
            )}
          >
            {isValidUrl(option.value) ? (
              <img src={option.value} alt="option" />
            ) : (
              <p>{option.value}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Question;
