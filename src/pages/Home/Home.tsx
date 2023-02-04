import { useRef, useContext, useEffect, useState } from "react";
import {
  QuestionObjective,
  QuestionInteger,
  Header,
  Button,
  Legend,
  Modal,
} from "../../components";
import styles from "./Home.module.scss";
import expandRight from "../../assets/icons/greaterThan.svg";
import { TestsContext } from "../../utils/contexts/TestsContext";
import {
  IQuestionInteger,
  IQuestionObjective,
  IQuestionWithID,
} from "../../utils/interfaces";
import clsx from "clsx";
import { TEST_ACTION_TYPES } from "../../utils/actions";
import { AuthContext } from "../../utils/auth/AuthContext";
import { uniqueValuesOnly } from "../../utils/reducers/TestReducer";
import { useNavigate } from "react-router-dom";
import { AUTH_TOKEN } from "src/utils/constants";
import RenderWithLatex from "src/components/RenderWithLatex/RenderWithLatex";
import QuestionPaper from "./components/QuestionPaper";

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  const navigate = useNavigate();
  const [language, setLanguage] = useState<string>("en");

  const { state, dispatch } = useContext(TestsContext);
  const { questions, currentQuestion, test, status } = state;
  const [question, setQuestion] = useState<any>({} as any);
  const [timeTakenAllQuestions, setTimeTakenAllQuestions] = useState<{
    [key: string]: number;
  }>({});
  const [questionPaperModal, setQuestionPaperModal] = useState<boolean>(false);
  const [exitFullScreenModal, setExitFullScreenModal] =
    useState<boolean>(false);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });
  const [isExpanded, setIsExpanded] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // console.log({ timeTakenAllQuestions });
  }, [timeTakenAllQuestions]);

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
      payload: {
        currentQuestion,
        timeTakenInSeconds:
          timeTakenAllQuestions[questions[currentQuestion].id],
      },
    });
  }

  function handleClickPrev() {
    if (currentQuestion === 0) return;
    dispatch({
      type: TEST_ACTION_TYPES.PREVIOUS_QUESTION,
      payload: {
        currentQuestion,
        timeTakenInSeconds:
          timeTakenAllQuestions[questions[currentQuestion].id],
      },
    });
  }

  function handleClickSaveAndNext(option: string | null) {
    console.log(option);
    console.log(question.selectedOptions);
    if (!option?.length) {
      if (question.type === "integer") {
        return setAlertModal({
          open: true,
          title: "Warning",
          message: "Please enter a valid number!",
        });
      }
      return setAlertModal({
        open: true,
        title: "Warning",
        message: "Please Select an option!",
      });
    }
    dispatch({
      type: TEST_ACTION_TYPES.SAVE_AND_NEXT,
      payload: {
        currentQuestion,
        selectedOption:
          question.type === "integer"
            ? question.enteredAnswer
            : question.selectedOptions,
        timeTakenInSeconds:
          timeTakenAllQuestions[questions[currentQuestion].id],
      },
    });
  }

  function handleClickMarkForReview() {
    dispatch({
      type: TEST_ACTION_TYPES.MARK_FOR_REVIEW_AND_NEXT,
      payload: {
        currentQuestion,
        timeTakenInSeconds:
          timeTakenAllQuestions[questions[currentQuestion].id],
      },
    });
  }

  function handleClickSaveAndMarkForReview(option: string | null) {
    if (!option?.length) {
      if (question.type === "integer") {
        return setAlertModal({
          open: true,
          title: "Warning",
          message: "Please enter a valid number!",
        });
      }
      return setAlertModal({
        open: true,
        title: "Warning",
        message: "Please Select an option!",
      });
    }
    dispatch({
      type: TEST_ACTION_TYPES.SAVE_AND_MARK_FOR_REVIEW,
      payload: {
        currentQuestion,
        selectedOption:
          question.type === "integer"
            ? question.enteredAnswer
            : question.selectedOptions,
        timeTakenInSeconds:
          timeTakenAllQuestions[questions[currentQuestion].id],
      },
    });
  }

  function handleClickOption(option: string) {
    if (question.type === "single") {
      setQuestion((curr: any) => ({
        ...curr,
        selectedOptions: curr.selectedOptions.includes(option) ? [] : [option],
      }));
    } else {
      setQuestion((curr: any) => ({
        ...curr,
        selectedOptions: curr.selectedOptions.includes(option)
          ? curr.selectedOptions.filter((o: any) => o !== option)
          : [...curr.selectedOptions, option],
      }));
    }
  }

  function handleClickClear() {
    console.log(question);
    if (question.type === "single" || question.type === "multiple") {
      if (question.selectedOptions?.length === 0) return;
      console.log("hey");
      setQuestion({
        ...question,
        selectedOptions: [],
      });
      dispatch({
        type: TEST_ACTION_TYPES.CLEAR_SELECTION,
        payload: currentQuestion,
      });
    } else if (question.type === "integer") {
      //Dont know why but this is making the entered answer undefined
      setQuestion({
        ...question,
        enteredAnswer: "",
      });

      dispatch({
        type: TEST_ACTION_TYPES.CLEAR_SELECTION,
        payload: currentQuestion,
      });
    }
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
        cb: (error: any) => {
          if (error) {
            return setAlertModal({
              open: true,
              title: "Error",
              message: error,
            });
          }
          handleScreen();
          navigate("/result");
        },
      },
    });
  }

  useEffect(() => {
    if (test) {
      if (questions?.length) {
        let quest: any = questions[currentQuestion];

        if (quest) {
          if (quest.type === "single" || quest.type === "multiple") {
            setQuestion({
              ...questions[currentQuestion],
              options: quest[language].options,
            });
          } else if (quest.type === "integer") {
            setQuestion({
              ...questions[currentQuestion],
            });
          }
        }
      }
    }
  }, [currentQuestion, questions, test, language]);

  useEffect(() => {
    console.log({ status, question });
  }, [status, question]);

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
        <main
          className={clsx(
            styles.leftContainer,
            isExpanded && styles.maxWidthLeftContainer
          )}
        >
          {(question?.type === "single" || question?.type === "multiple") && (
            <QuestionObjective
              question={{
                en: question.en,
                hi: question.hi,
              }}
              id={question.id}
              index={currentQuestion}
              selectedOptions={question.selectedOptions}
              key={question.id}
              type={question.type}
              onClickOption={handleClickOption}
              language={language}
              timeTakenInSeconds={
                questions[currentQuestion].status.timeTakenInSeconds
              }
              setTimeTakenAllQuestions={setTimeTakenAllQuestions}
            />
          )}
          {question?.type === "integer" && (
            <QuestionInteger
              question={{
                en: question.en,
                hi: question.hi,
              }}
              id={question.id}
              enteredAnswer={question.enteredAnswer}
              index={currentQuestion}
              key={question.id}
              language={language}
              timeTakenInSeconds={
                questions[currentQuestion].status.timeTakenInSeconds
              }
              setTimeTakenAllQuestions={setTimeTakenAllQuestions}
              onChangeValue={(e: any) => {
                setQuestion({
                  ...question,
                  enteredAnswer: e.target.value,
                });
              }}
            />
          )}
          <div className={styles.actionButtonsContainer}>
            <Button
              style={{
                background: "#55bc7e",
                border: "1px solid #55bc7e",
              }}
              color="success"
              onClick={() =>
                handleClickSaveAndNext(
                  question.type === "integer"
                    ? question.enteredAnswer
                    : question.selectedOptions[
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
                  question.type === "integer"
                    ? question.enteredAnswer
                    : question.selectedOptions[
                        question.selectedOptions.length - 1
                      ]
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
        <aside
          className={
            !isExpanded ? styles.rightContainer : styles.hideRightContainer
          }
        >
          <Button
            className={styles.expandRight}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <img src={expandRight} alt="Expand Right" />
          </Button>
          {!isExpanded && (
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
                        payload: {
                          currentQuestion: i,
                          timeTakenInSeconds:
                            timeTakenAllQuestions[questions[i].id],
                        },
                      })
                    }
                  >
                    {i + 1}
                  </QuestionButton>
                ))}
              </div>
            </div>
          )}
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
        {questions?.length && questionPaperModal && (
          <QuestionPaper questions={questions} />
        )}
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

function getUserAnswerByType(question: any) {
  switch (question.type) {
    case "integer":
      return question.enteredAnswer;
    case "single":
    case "multiple":
      return question.selectedOptions[question.selectedOptions.length - 1];
    default:
      return null;
  }
}

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
