import { Question, Header, Button } from "../../components";
import styles from "./Home.module.scss";
import { useRef } from "react";
import expandRight from "../../assets/icons/greaterThan.svg";

const Home = () => {
  const mainRef = useRef<HTMLDivElement>(null);
  const questions = [
    {
      question:
        "One of the easiest and handy tricks for MCQ of JEE Mains guess work is the assumption. Often it becomes easier to solve an equation when we put some assumed values to get the correct answer. The method is similar to the substitution technique. For example, in a question related to trigonometry, you can substitute Ɵ with any assumed value say 45°. This value can be applied to the given answer options for easily and quickly solving the problem.",
      options: [
        { id: 1, value: "f1 = {(x,y): y = x + 1}" },
        { id: 2, value: "f2 = {(x,y): y < = x}" },
        { id: 3, value: "f3 = { (x,y): x + y = > 5}" },
        { id: 4, value: "None of these" },
      ],
      selectedOption: { id: 1, value: "New Delhi" },
      type: "mcq",
    },
  ];
  function handleScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  return (
    <div ref={mainRef} className={styles.container}>
      <Header />
      <section className={styles.mainContainer}>
        <main className={styles.leftContainer}>
          <Question
            question={questions[0].question}
            options={questions[0].options}
            index={12}
            selectedOption={null}
            key={questions[0].question}
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
            >
              Back{" "}
            </Button>
            <Button
              style={{
                background: "white",
                color: "black",
                border: "1px solid black",
              }}
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
            <div className={styles.legendContainer}></div>
            <div className={styles.questionButtonsContainer}>
              {Array(150)
                .fill(0)
                .map((item, i) => {
                  return <button>{i}</button>;
                })}
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
