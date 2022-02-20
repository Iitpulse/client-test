import styles from "./Header.module.scss";
import { TestInfo, Button } from "../../components";
import logo from "../../assets/images/logo.svg";
import question from "../../assets/icons/note.svg";
import info from "../../assets/icons/info.svg";
import { useNavigate } from "react-router-dom";

interface IHeaderProps {
  onClickViewQuestionPaper?: () => void;
  onClickViewInstructions?: () => void;
}

const Header: React.FC<IHeaderProps> = ({ onClickViewQuestionPaper }) => {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
        <div className={styles.moreInfoTest}>
          <Button
            icon={<img src={question} alt="List" />}
            color="success"
            onClick={onClickViewQuestionPaper}
          >
            View Question Paper
          </Button>
          <Button
            onClick={() => {
              navigate("/login");
              localStorage.removeItem("token");
            }}
            icon={<img src={info} alt="List" />}
          >
            View Instruction
          </Button>
        </div>
      </section>
      <TestInfo />
    </div>
  );
};

export default Header;
