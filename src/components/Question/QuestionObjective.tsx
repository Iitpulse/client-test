import clsx from "clsx";
import { IOption } from "../../utils/interfaces";
import { isValidUrl } from "../../utils/utils";
import arrowDown from "../../assets/icons/arrowDown.svg";
import styles from "./Question.module.scss";
import RenderWithLatex from "../RenderWithLatex/RenderWithLatex";

interface Props {
  question: any;
  selectedOptions: Array<string>;
  type: "single" | "multiple";
  index: number;
  language: string;
  onClickOption: (option: string) => void;
  integerTypeAnswer: string;
}

const Question: React.FC<Props> = ({
  index,
  question,
  selectedOptions,
  type,
  onClickOption,
  language,
  integerTypeAnswer,
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
        </>
      )}
    </div>
  );
};

export default Question;
