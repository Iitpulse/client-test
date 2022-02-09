import clsx from "clsx";
import { IOption } from "../../utils/interfaces";
import { isValidUrl } from "../../utils/utils";
import { Button } from "../../components";
import arrowDown from "../../assets/icons/arrowDown.svg";
import styles from "./Question.module.scss";

interface Props {
  question: string;
  options: Array<IOption>;
  selectedOptions: Array<string>;
  type: "mcq" | "numerical";
  index: number;
  onClickOption: (option: string) => void;
}

const Question: React.FC<Props> = ({
  index,
  question,
  options,
  selectedOptions,
  type,
  onClickOption,
}) => {
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
          <p>{question}</p>
        )}
      </div>
      <ul className={styles.options}>
        {options.map((option, i) => (
          <li
            key={`${option.id}-${i}`}
            className={clsx(
              styles.option,
              selectedOptions?.includes(option.id) && styles.selected
            )}
          >
            <input
              type="radio"
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
                <p>{option.value}</p>
              )}
            </label>
          </li>
        ))}
      </ul>
      <div className={styles.buttonContainer}>
        <a id="bottom" href="#top">
          <img src={arrowDown} alt="Arrow Up" />
        </a>
      </div>
    </div>
  );
};

export default Question;
