import styles from "./StudentProfile.module.scss";
import profilePlaceholderImage from "../../assets/images/profilePlaceholderImage.jpg";
import { useContext, useEffect, useState } from "react";
import { TEST_ACTION_TYPES } from "../../utils/actions";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { AUTH_TOKEN } from "src/utils/constants";
import { TestsContext } from "../../utils/contexts/TestsContext";

interface Props {
  image?: string;
}

type RemainingTime = {
  hours: string;
  minutes: string;
  seconds: string;
};

const StudentProfile = (props: Props) => {
  const { currentUser, userDetails } = useContext(AuthContext);
  const { state, dispatch } = useContext(TestsContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const { image } = props;
  const [Name, SetName] = useState<string>("");
  const [Exam, SetExam] = useState<string>("");
  const [timer, setTimer] = useState<RemainingTime>({
    hours: "03",
    minutes: "00",
    seconds: "00",
  });
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  function handleScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  useEffect(()=>{
    console.log(userDetails);
    SetName(userDetails?.name);
    SetExam(userDetails?.exam);
  },[userDetails])

  useEffect(() => {
    let remTime = localStorage.getItem("remainingTime");
    if (remTime) {
      setTimer(JSON.parse(remTime));
    }
    let countDownDate = new Date(
      new Date().setHours(new Date().getHours() + 3)
    ).getTime();

    let x = setInterval(function () {
      let now = new Date().getTime();

      let distance = countDownDate - now;

      let intHr = Math.floor(distance / (1000 * 60 * 60));
      let intMin = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      let intSec = Math.floor((distance % (1000 * 60)) / 1000);

      let s = intSec.toString();
      let h = intHr.toString();
      let m = intMin.toString();

      if (intSec < 10) s = "0" + s;
      if (intMin < 10) m = "0" + m;
      // if (intHr < 10) s = "0" + s;

      setTimer({ hours: h ?? "00", minutes: m ?? "00", seconds: s ?? "00" });

      if (distance < 0) {
        clearInterval(x);
        setTimer({ hours: "00", minutes: "00", seconds: "00" });
        if (!currentUser) return alert("No valid user found");
        setLoading(true);
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
              setLoading(false);
            },
          },
        });
      }
    }, 1000); // update every one second

  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <img src={image ? image : profilePlaceholderImage} alt={userDetails.name} />
      </div>
      <div className={styles.textContainer}>
        <p>
          <span>Name : </span>
          <span className={styles.fieldAnswerTextual}>{userDetails.name}</span>
        </p>
        <p>
          <span>Exam : </span>
          <span className={styles.fieldAnswerTextual}>{userDetails.exam}</span>
        </p>
        <p>
          <span>Time Remaining : </span>
          <span className={styles.timeTag}>
            {timer.hours} : {timer.minutes} : {timer.seconds}
          </span>
        </p>
      </div>
    </div>
  );
};

export default StudentProfile;
