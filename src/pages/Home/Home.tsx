import { useRef, useContext, useEffect, useState } from "react";
import { Question, Header, Button, Legend, Modal } from "../../components";
import styles from "./Home.module.scss";
import expandRight from "../../assets/icons/greaterThan.svg";
import { TestsContext } from "../../utils/contexts/TestsContext";
import { IQuestion, IQuestionWithID } from "../../utils/interfaces";
import clsx from "clsx";
import { TEST_ACTION_TYPES } from "../../utils/actions";
import { AuthContext } from "../../utils/auth/AuthContext";
import { uniqueValuesOnly } from "../../utils/reducers/TestReducer";
import { useNavigate } from "react-router-dom";
import { AUTH_TOKEN } from "src/utils/constants";
import RenderWithLatex from "src/components/RenderWithLatex/RenderWithLatex";

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  const navigate = useNavigate();
  const [language, setLanguage] = useState<string>("en");

  const { state, dispatch } = useContext(TestsContext);

  const { questions, currentQuestion, test, status } = state;

  const [question, setQuestion] = useState<IQuestion>({
    id: "",
    en: {
      question: "",
      options: [],
      solution: "",
    },
    hi: {
      question: "",
      options: [],
      solution: "",
    },
    options: [],
    selectedOptions: [],
    type: "mcq",
    markingScheme: {
      correct: [4],
      incorrect: -1,
    },
  });

  const [questionPaperModal, setQuestionPaperModal] = useState<boolean>(false);
  const [exitFullScreenModal, setExitFullScreenModal] =
    useState<boolean>(false);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });
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
    if (currentQuestion === 0) return;
    dispatch({
      type: TEST_ACTION_TYPES.PREVIOUS_QUESTION,
      payload: currentQuestion,
    });
  }
  // PENDING
  function handleClickSaveAndNext(option: string | null) {
    console.log(option);
    console.log(question.selectedOptions);
    if (!option)
      return setAlertModal({
        open: true,
        title: "Warning",
        message: "Please Select an option!",
      });
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

  function handleClickSaveAndMarkForReview(option: string | null) {
    if (!option)
      setAlertModal({
        open: true,
        title: "Warning",
        message: "Please Select an option!",
      });
    dispatch({
      type: TEST_ACTION_TYPES.SAVE_AND_MARK_FOR_REVIEW,
      payload: { currentQuestion, selectedOption: option },
    });
  }

  function handleClickOption(option: string) {
    console.log({ option });
    console.log(question);
    if (question.type === "single") {
      setQuestion((curr) => ({
        ...curr,
        selectedOptions: curr.selectedOptions.includes(option) ? [] : [option],
      }));
    } else {
      setQuestion((curr) => ({
        ...curr,
        selectedOptions: curr.selectedOptions.includes(option)
          ? curr.selectedOptions.filter((o) => o !== option)
          : [...curr.selectedOptions, option],
      }));
    }
  }

  function handleClickClear() {
    if (!question.selectedOptions?.length) return;
    setQuestion({
      ...question,
      selectedOptions: [],
    });
    dispatch({
      type: TEST_ACTION_TYPES.CLEAR_SELECTION,
      payload: currentQuestion,
    });
  }

  async function handleClickSubmit() {
    if (!currentUser) return alert("No valid user found");

    dispatch({
      type: TEST_ACTION_TYPES.SUBMIT_TEST,
      payload: {
        test,
        user: {
          id: currentUser.id,
          type: currentUser.userType,
          instituteId: currentUser.instituteId,
        },
        token: localStorage.getItem(AUTH_TOKEN),
        cb: () => {
          handleScreen();
          navigate("/result");
        },
      },
    });
  }

  useEffect(() => {
    if (test) {
      console.log({ questions, test, currentQuestion });
      if (questions?.length) {
        let quest: any = questions[currentQuestion];
        if (quest) {
          console.log({ quest });
          setQuestion({
            ...questions[currentQuestion],
            options: quest[language].options,
          });
        }
      }
    }
  }, [currentQuestion, questions, test, language]);

  useEffect(() => {
    console.log({ status });
  }, [status]);

  // fullScreen even listener
  useEffect(() => {
    function manageFullScreen(e: any) {
      // if (e.keyCode === 27) {
      if (!document.fullscreenElement) {
        setExitFullScreenModal(true);
      } else {
        setExitFullScreenModal(false);
      }
      // }
    }
    if (!document.fullscreenElement) {
      setExitFullScreenModal(true);
    }

    document.addEventListener("fullscreenchange", manageFullScreen);

    return () => {
      document.removeEventListener("fullscreenchange", manageFullScreen);
    };
  }, []);

  return (
    <div ref={mainRef} className={styles.container}>
      <Header
        onClickViewQuestionPaper={() => setQuestionPaperModal(true)}
        onChangeLanguage={(e: any) => setLanguage(e.target.value)}
      />
      <section className={styles.mainContainer}>
        <main className={styles.leftContainer}>
          <Question
            question={{
              en: question.en,
              hi: question.hi,
            }}
            options={question.options}
            index={currentQuestion}
            selectedOptions={question.selectedOptions}
            key={question.id}
            type={question.type}
            onClickOption={handleClickOption}
            language={language}
          />
          <div className={styles.actionButtonsContainer}>
            <Button
              style={{
                background: "#55bc7e",
                border: "1px solid #55bc7e",
              }}
              color="success"
              onClick={() =>
                handleClickSaveAndNext(
                  question.selectedOptions[
                    question.selectedOptions.length - 1
                  ] || null
                )
              }
            >
              Save {"&"} Next
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
                handleClickSaveAndMarkForReview(
                  question.selectedOptions[question.selectedOptions.length - 1]
                )
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
          <div className={styles.navigationBtnsContainer}>
            <div className={styles.navigationBtns}>
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
            <Button
              color="success"
              onClick={handleClickSubmit}
              title="Submit Test"
            >
              Submit
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
              {questions?.map((question, i) => (
                <QuestionButton
                  key={"QBTN_" + question.id}
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
      <Modal
        isOpen={questionPaperModal}
        onClose={() => setQuestionPaperModal(false)}
        title="Question Paper"
        backdrop
      >
        {questions?.length && <QuestionPaper questions={questions} />}
      </Modal>
      <Modal
        isOpen={exitFullScreenModal}
        onClose={() => {
          handleScreen();
          setExitFullScreenModal(false);
        }}
        title="Are you sure you want to exit full screen?"
        backdrop
      >
        <div className={styles.flexRow}>
          <Button color="error">Yes, Submit Test</Button>&nbsp;
          <Button
            color="primary"
            onClick={() => {
              handleScreen();
              setExitFullScreenModal(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={alertModal?.open}
        title={alertModal?.title}
        onClose={() => setAlertModal({ open: false, title: "", message: "" })}
        backdrop
      >
        <p>{alertModal?.message}</p>
      </Modal>
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

const QuestionPaper: React.FC<{ questions: Array<IQuestionWithID> }> = ({
  questions,
}) => {
  console.log(questions[0]?.id);
  const marking = ["a", "b", "c", "d"];
  return (
    <div className={styles.questions}>
      {questions.map((question, i) => (
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
      ))}
    </div>
  );
};
