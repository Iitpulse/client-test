import { useRef, useContext, useEffect, useState } from "react";
import { Question, Header, Button, Legend } from "../../components";
import styles from "./Home.module.scss";
import expandRight from "../../assets/icons/greaterThan.svg";
import { TestsContext } from "../../utils/contexts/TestsContext";
import { IQuestion, ITest } from "../../utils/interfaces";

const Home = () => {
  const {
    globalTest,
    test,
    setTest,
    status,
    currentQuestion,
    handleChangeCurrentQuestion,
    questions,
  } = useContext(TestsContext);

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
    if (currentQuestion < questions.length - 1) {
      handleChangeCurrentQuestion(currentQuestion + 1);
    }
  }

  function handleClickPrev() {
    if (currentQuestion > 0) {
      handleChangeCurrentQuestion(currentQuestion - 1);
    }
  }

  useEffect(() => {
    if (test) {
      setQuestion(questions[currentQuestion]);
    }
  }, [currentQuestion, questions, test]);

  useEffect(() => {
    console.log({ test });
  }, [test]);

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
          />
          <div className={styles.actionButtonsContainer}>
            <Button
              style={{
                background: "#55bc7e",
                border: "1px solid #55bc7e",
              }}
              color="success"
            >
              Save {"&"} Next{" "}
            </Button>
            <Button
              style={{
                background: "white",
                color: "black",
                border: "1px solid black",
              }}
            >
              Clear
            </Button>
            <Button
              style={{
                background: "#3a1772",
                border: "1px solid #3a1772",
              }}
              color="warning"
            >
              Save {"&"} Mark For Review
            </Button>
            <Button
              style={{
                border: "1px solid #61b4f1",
              }}
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
                <QuestionButton onClick={() => handleChangeCurrentQuestion(i)}>
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
}

const QuestionButton = (props: QuestionButtonProps) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};

function getCurrentQuestion(
  test: ITest,
  currentQuestion: number,
  currentSection: number,
  currentSubSection: number
): IQuestion {
  return test.sections[currentSection].subSections[currentSubSection].questions[
    currentQuestion
  ];
}
