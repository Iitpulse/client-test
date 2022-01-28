import { useRef, useContext, useEffect, useState } from "react";
import { Question, Header, Button, Legend } from "../../components";
import styles from "./Home.module.scss";
import expandRight from "../../assets/icons/greaterThan.svg";
import { TestsContext } from "../../utils/contexts/TestsContext";
import { IOption, IQuestion, ITest } from "../../utils/interfaces";
import clsx from "clsx";
import { TEST_ACTION_TYPES } from "../../utils/actions";

const Home = () => {
  const { state, dispatch } = useContext(TestsContext);

  const { questions, currentQuestion, test, status } = state;

  const [question, setQuestion] = useState<IQuestion>({
    id: "",
    question: "",
    options: [],
    selectedOption: {
      id: "",
      value: "",
    },
    type: "mcq",
    markingScheme: {
      correct: [4],
      incorrect: -1,
    },
  });

  const mainRef = useRef<HTMLDivElement>(null);

  function handleScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleClickNext() {
    if (currentQuestion === questions.length - 1) return;
    dispatch({
      type: TEST_ACTION_TYPES.NEXT_QUESTION,
      payload: currentQuestion,
    });
  }

  function handleClickPrev() {
    dispatch({
      type: TEST_ACTION_TYPES.PREVIOUS_QUESTION,
      payload: currentQuestion,
    });
  }

  function handleClickSaveAndNext(option: IOption | null) {
    if (!option) return alert("Please select an option");
    dispatch({
      type: TEST_ACTION_TYPES.SAVE_AND_NEXT,
      payload: { currentQuestion, selectedOption: option },
    });
  }

  function handleClickMarkForReview() {
    dispatch({
      type: TEST_ACTION_TYPES.MARK_FOR_REVIEW_AND_NEXT,
      payload: currentQuestion,
    });
  }

  function handleClickSaveAndMarkForReview(option: IOption | null) {
    if (!option) return alert("Please select an option");
    dispatch({
      type: TEST_ACTION_TYPES.SAVE_AND_MARK_FOR_REVIEW,
      payload: { currentQuestion, selectedOption: option },
    });
  }

  function handleClickOption(option: IOption) {
    setQuestion({
      ...question,
      selectedOption: option,
    });
  }

  function handleClickClear() {
    if (!question.selectedOption) return;
    setQuestion({
      ...question,
      selectedOption: null,
    });
    dispatch({
      type: TEST_ACTION_TYPES.CLEAR_SELECTION,
      payload: currentQuestion,
    });
  }

  useEffect(() => {
    if (test) {
      console.log({ questions, test });
      if (questions?.length) setQuestion(questions[currentQuestion]);
    }
  }, [currentQuestion, questions, test]);

  useEffect(() => {
    console.log({ status });
  }, [status]);

  return (
    <div ref={mainRef} className={styles.container}>
      <Header />
      <section className={styles.mainContainer}>
        <main className={styles.leftContainer}>
          <Question
            question={question.question}
            options={question.options}
            index={currentQuestion}
            selectedOption={question.selectedOption}
            key={question.id}
            type="mcq"
            onClickOption={handleClickOption}
          />
          <div className={styles.actionButtonsContainer}>
            <Button
              style={{
                background: "#55bc7e",
                border: "1px solid #55bc7e",
              }}
              color="success"
              onClick={() => handleClickSaveAndNext(question.selectedOption)}
            >
              Save {"&"} Next{" "}
            </Button>
            <Button
              style={{
                background: "white",
                color: "black",
                border: "1px solid black",
              }}
              onClick={handleClickClear}
            >
              Clear
            </Button>
            <Button
              style={{
                background: "#3a1772",
                border: "1px solid #3a1772",
              }}
              color="warning"
              onClick={() =>
                handleClickSaveAndMarkForReview(question.selectedOption)
              }
            >
              Save {"&"} Mark For Review
            </Button>
            <Button
              style={{
                border: "1px solid #61b4f1",
              }}
              onClick={handleClickMarkForReview}
            >
              Mark For Review {"&"} Next{" "}
            </Button>
          </div>
          <div className={styles.navigationButtonsContainer}>
            <Button
              style={{
                background: "white",
                color: "black",
                border: "1px solid black",
              }}
              onClick={handleClickPrev}
            >
              Back
            </Button>
            <Button
              style={{
                background: "white",
                color: "black",
                border: "1px solid black",
              }}
              onClick={handleClickNext}
            >
              Next
            </Button>
          </div>
        </main>
        <aside className={styles.rightContainer}>
          <Button className={styles.expandRight}>
            <img src={expandRight} alt="Expand Right" />
          </Button>
          <div className={styles.mainContent}>
            <Legend status={status} />
            <div className={styles.questionButtonsContainer}>
              {questions.map((question, i) => (
                <QuestionButton
                  key={question.question + i}
                  status={question.status.status}
                  onClick={() =>
                    dispatch({
                      type: TEST_ACTION_TYPES.GO_TO_QUESTION,
                      payload: i,
                    })
                  }
                >
                  {i + 1}
                </QuestionButton>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {/* <Button onClick={handleScreen}>Toggle Screen</Button> */}
      <section className={styles.instructionContainer}></section>
    </div>
  );
};

export default Home;

interface QuestionButtonProps {
  children: number;
  onClick: () => void;
  status:
    | "notVisited"
    | "notAnswered"
    | "answered"
    | "markedForReview"
    | "answeredAndMarkedForReview"
    | string;
}

const QuestionButton = (props: QuestionButtonProps) => {
  return (
    <button
      onClick={props.onClick}
      className={clsx(styles.questionBtn, styles[props.status])}
    >
      {props.children}
    </button>
  );
};
