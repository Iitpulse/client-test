import styles from "./StudentProfile.module.scss";
import profilePlaceholderImage from "../../assets/images/profilePlaceholderImage.jpg";
import { useEffect, useState } from "react";

interface Props {
  name: string;
  exam: string;
  image?: string;
}

type RemainingTime = {
  hours: string;
  minutes: string;
  seconds: string;
};

const StudentProfile = (props: Props) => {
  const { name, exam, image } = props;
  const [timer, setTimer] = useState<RemainingTime>({
    hours: "03",
    minutes: "00",
    seconds: "00",
  });

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
      }
    }, 1000); // update every one second
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <img src={image ? image : profilePlaceholderImage} alt={name} />
      </div>
      <div className={styles.textContainer}>
        <p>
          <span>Name : </span>
          <span className={styles.fieldAnswerTextual}>{name}</span>
        </p>
        <p>
          <span>Exam : </span>
          <span className={styles.fieldAnswerTextual}>{exam}</span>
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
