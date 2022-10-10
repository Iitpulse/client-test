import styles from "./Header.module.scss";
import { TestInfo, Button } from "../../components";
import logo from "../../assets/images/logo.svg";
import question from "../../assets/icons/note.svg";
import info from "../../assets/icons/info.svg";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { AUTH_TOKEN } from "src/utils/constants";

interface IHeaderProps {
  rightComp?: React.ReactNode;
  testInfoLeftComp?: React.ReactNode;
  testInfoRightComp?: React.ReactNode;
  classes?: Array<string>;
  onClickViewQuestionPaper?: () => void;
  onClickViewInstructions?: () => void;
  onChangeLanguage?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const Header: React.FC<IHeaderProps> = ({
  onClickViewQuestionPaper,
  rightComp: RightComp,
  testInfoLeftComp: TestInfoLeftComp,
  testInfoRightComp: TestInfoRightComp,
  onChangeLanguage,
  classes,
}) => {
  const navigate = useNavigate();
  return (
    <div className={clsx(styles.container, classes)}>
      <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
        {RightComp || (
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
                localStorage.removeItem(AUTH_TOKEN);
              }}
              icon={<img src={info} alt="List" />}
            >
              View Instruction
            </Button>
          </div>
        )}
      </section>
      <TestInfo
        testInfoLeftComp={TestInfoLeftComp}
        testInfoRightComp={TestInfoRightComp}
        onChangeLanguage={onChangeLanguage}
      />
    </div>
  );
};

export default Header;
