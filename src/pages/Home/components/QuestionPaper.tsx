import { memo } from "react";
import styles from "../Home.module.scss";
import RenderWithLatex from "src/components/RenderWithLatex/RenderWithLatex";
import { IQuestionWithID } from "src/utils/interfaces";

const QuestionPaper: React.FC<{ questions: Array<IQuestionWithID> }> = ({
  questions,
}) => {
  console.log(questions[0]?.id);
  const marking = ["a", "b", "c", "d"];
  function getCombinedQuestion(question: any) {
    if (question.type === "single" || question.type === "multiple") {
      return (
        question?.en?.question +
        question?.en?.options
          .map(
            (op: any, idx: number) =>
              `<span style='display:flex;justify-content:flex-start;margin:1rem 0;background:${
                question.correctAnswers?.includes(op.id)
                  ? "rgba(85, 188, 126, 0.3)"
                  : "transparent"
              };border-radius:5px;padding:0.4rem 0.6rem;'> ${String.fromCharCode(
                idx + 65
              )}. <span style='margin-left:1rem;'>${op.value}</span></span>`
          )
          .join("") +
        "<br /><hr /><br />"
      );
    } else if (question.type === "integer") {
      return question?.en?.question + "<br /><hr /><br />";
    }
    return "";
  }
  return (
    <div className={styles.questions}>
      {/* {questions.map((question, i) => (
          <div key={"QUES_" + question.id} className={styles.question}>
            <div className={styles.questionWrapper}>
              <span>{i + 1}. </span>
              <RenderWithLatex quillString={question?.en?.question} />
            </div>
            <div className={styles.optionWrapper}>
              {question.en.options.map((option, ind) => (
                <div className={styles.option}>
                  <span>{marking[ind] + "."}</span>
                  <RenderWithLatex quillString={option.value} />
                </div>
              ))}
            </div>
          </div>
        ))} */}
      {questions.map((question, i) => {
        return (
          <RenderWithLatex
            key={i}
            quillString={getCombinedQuestion(question)}
          />
        );
      })}
    </div>
  );
};

export default memo(QuestionPaper);
