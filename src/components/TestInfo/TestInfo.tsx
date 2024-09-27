import styles from "./TestInfo.module.scss";
import { StudentProfile } from "../../components";
import currentUserImage from "../../assets/images/currentUserImage.jpg";

interface Props {
  testInfoLeftComp?: React.ReactNode;
  testInfoRightComp?: React.ReactNode;
  onChangeLanguage?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const TestInfo: React.FC<Props> = ({
  testInfoLeftComp: LeftComp,
  testInfoRightComp: RightComp,
  onChangeLanguage,
}) => {




  return (
    <div className={styles.container}>
      {LeftComp || (
        <StudentProfile
          image={currentUserImage}
        />
      )}
      {RightComp || (
        <select title="Langauge" name="language" onChange={onChangeLanguage}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
      )}
    </div>
  );
};

export default TestInfo;
