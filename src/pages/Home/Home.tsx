import { Question } from "../../components";
import styles from "./Home.module.scss";

const Home = () => {
  const questions = [
    {
      question: "What is the capital of India?",
      options: [
        { id: 1, value: "New Delhi" },
        { id: 2, value: "Mumbai" },
        { id: 3, value: "Chennai" },
        { id: 4, value: "Kolkata" },
      ],
      selectedOption: { id: 1, value: "New Delhi" },
      type: "mcq",
    },
  ];
  return (
    <div>
      {questions.map((question, i) => (
        <Question
          question={question.question}
          options={question.options}
          index={i}
          selectedOption={null}
          key={question.question}
          type="mcq"
        />
      ))}
    </div>
  );
};

export default Home;
