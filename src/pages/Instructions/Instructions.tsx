import React, { useState } from "react";
import styles from "./Instructions.module.scss";
import logo from "../../assets/images/logo.svg";
import { Button, Header } from "src/components";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import arrowDown from "../../assets/icons/arrowDown.svg";

interface InstructionType {
  type: "text" | "rich";
  children?: Array<InstructionType>;
  content: string | React.ReactNode;
}

const Instructions = () => {
  const navigate = useNavigate();
  const [confirmCheck, setConfirmCheck] = useState(false);

  function handleScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleClickContinue() {
    if (!confirmCheck) {
      return alert("Please confirm that you have read the instructions");
    }
    handleScreen();
    navigate("/");
  }

  const generalInstructions: Array<InstructionType> = [
    {
      type: "text",
      content:
        "Total duration of JEE-Main - PAPER 1 EHG 10th  April SHIFT 2 is 180 min.",
    },
    {
      type: "text",
      content:
        "The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.",
    },
    {
      type: "text",
      content:
        "The Questions Palette displayed on the right side of screen will show the status of each question using one of the following symbols:",
      children: [
        {
          type: "rich",
          content: (
            <span>
              <span className={styles.notVisitedBtn}></span>
              You have not visited the question yet.
            </span>
          ),
        },
        {
          type: "rich",
          content: (
            <span>
              <span className={styles.notAnswered}></span>
              You have not answered the question.
            </span>
          ),
        },
        {
          type: "rich",
          content: (
            <span>
              <span className={styles.answered}></span>
              You have answered the question.
            </span>
          ),
        },
        {
          type: "rich",
          content: (
            <span>
              <span className={styles.markForReview}></span>
              You have NOT answered the question but have marked for review.
            </span>
          ),
        },
        {
          type: "rich",
          content: (
            <span>
              <span className={styles.answeredAndMarkForReview}></span>
              The question(s) "Answered and Marked for Review" will be
              considered for evalution.
            </span>
          ),
        },
      ],
    },
    {
      type: "text",
      content:
        'You can click on the ">" arrow which apperes to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on "<" which appears on the right side of question window.',
    },
    {
      type: "text",
      content:
        'You can click on your "Profile" image on top right corner of your screen to change the language during the exam for entire question paper. On clicking of Profile image you will get a drop-down to change the question content to the desired language.',
    },
    {
      type: "rich",
      content: (
        <span>
          You can click on{" "}
          <span className={styles.arrowDown}>
            <img src={arrowDown} alt="down-arrow" width={20} />
          </span>
          to navigate to the bottom and{" "}
          <span className={styles.arrowUp}>
            <img src={arrowDown} alt="down-arrow" width={20} />
          </span>
          to navigate to the top of the question without scrolling.
        </span>
      ),
    },
  ];

  const navigatingToQuestionInstructions: Array<InstructionType> = [
    {
      type: "text",
      content: "To answer a question, do the following",
      children: [
        {
          type: "text",
          content:
            "Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.",
        },
        {
          type: "rich",
          content: (
            <span>
              Click on &nbsp;<strong>Save & Next</strong>&nbsp; to save your
              answer for the current question and then go to the next question.
            </span>
          ),
        },
        {
          type: "rich",
          content: (
            <span>
              Click on &nbsp;<strong>Mark for Review & Next</strong>&nbsp; to
              save your answer for the current question, mark it for review, and
              then go to the next question.
            </span>
          ),
        },
      ],
    },
  ];

  const answeringQuestionInstructions: Array<InstructionType> = [
    {
      type: "text",
      content: "Procedure for answering a multiple choice type question:",
      children: [
        {
          type: "text",
          content:
            "To select you answer, click on the button of one of the options.",
        },
        {
          type: "rich",
          content: (
            <span>
              To deselect your chosen answer, click on the button of the chosen
              option again or click on the &nbsp;<strong>Clear Response</strong>
              &nbsp; button
            </span>
          ),
        },
        {
          type: "text",
          content:
            "To change your chosen answer, click on the button of another option",
        },
        {
          type: "text",
          content:
            "To save your answer, you MUST click on the Save &amp; Next button.",
        },
        {
          type: "text",
          content:
            "To mark the question for review, click on the Mark for Review &amp; Next button.",
        },
      ],
    },
    {
      type: "text",
      content:
        "To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.",
    },
  ];

  const navigatinThroughSectionsInstructions: Array<InstructionType> = [
    {
      type: "text",
      content:
        "Sections in this question paper are displayed on the top bar of the screen. Questions in a section can be viewed by click on the section name. The section you are currently viewing is highlighted.",
    },
    {
      type: "text",
      content:
        "After click the Save &amp; Next button on the last question for a section, you will automatically be taken to the first question of the next section.",
    },
    {
      type: "text",
      content:
        "You can shuffle between sections and questions anything during the examination as per your convenience only during the time stipulated.",
    },
    {
      type: "text",
      content:
        "Candidate can view the corresponding section summery as part of the legend that appears in every section above the question palette.",
    },
  ];

  return (
    <div className={styles.container}>
      <Header
        testInfoLeftComp={<h3>GENERAL INSTRUCTIONS</h3>}
        rightComp={<p style={{ marginLeft: "auto" }}>Test</p>}
        classes={[styles.header]}
      />
      <section className={styles.main}>
        <h3>Please read the instructions carefully</h3>
        <div className={clsx(styles.instructionSection)}>
          <h4>General Instructions:</h4>
          <InstructionsList instructions={generalInstructions} />
        </div>
        <div className={clsx(styles.instructionSection)}>
          <h4>Navigating to a Question</h4>
          <InstructionsList instructions={navigatingToQuestionInstructions} />
        </div>
        <div className={clsx(styles.instructionSection)}>
          <h4>Answering a Question</h4>
          <InstructionsList instructions={answeringQuestionInstructions} />
        </div>
        <div className={clsx(styles.instructionSection)}>
          <h4>Navigation through sections</h4>
          <InstructionsList
            instructions={navigatinThroughSectionsInstructions}
          />
        </div>
        <hr />
        <p className={styles.warning}>
          Please note all questions will appear in your default language. This
          language can be changed for a particular question later on.
        </p>
        <hr />
        <label>
          <input
            style={{ marginTop: "2rem" }}
            type="checkbox"
            checked={confirmCheck}
            placeholder="Agree"
            onChange={(e) => setConfirmCheck(e.target.checked)}
          />
          &nbsp;&nbsp;I have read and understood the instructions. All computer
          hardware allotted to me are in proper working condition. I declare
          that I am not in possession of / not wearing / not carrying any
          prohibited gadget like mobile phone, bluetooth devices etc. /any
          prohibited material with me into the Examination Hall.I agree that in
          case of not adhering to the instructions, I shall be liable to be
          debarred from this Test and/or to disciplinary action, which may
          include ban from future Tests / Examinations
        </label>
        <Button
          onClick={handleClickContinue}
          classes={[styles.continueBtn]}
          color="warning"
          disabled={!confirmCheck}
        >
          Continue
        </Button>
      </section>
    </div>
  );
};

export default Instructions;

type InstructionsListProps = {
  instructions: Array<InstructionType>;
};

const InstructionsList: React.FC<InstructionsListProps> = ({
  instructions,
}) => {
  return (
    <ol>
      {instructions.map((instruction, i) =>
        instruction.children ? (
          <li>
            {instruction.content}
            <InstructionsList instructions={instruction.children} />
          </li>
        ) : (
          <li>{instruction.content}</li>
        )
      )}
    </ol>
  );
};
