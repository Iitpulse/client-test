import clsx from "clsx";
import styles from "./Legend.module.scss";

interface Props {
  status: {
    notVisitied: number;
    notAnswered: number;
    answered: number;
    markedForReview: number;
    answeredAndMarkedForReview: number;
  };
}

const Legend: React.FC<Props> = ({ status }) => {
  const {
    notVisitied,
    notAnswered,
    answered,
    markedForReview,
    answeredAndMarkedForReview,
  } = status;

  return (
    <div className={styles.container}>
      <div className={styles.subContainer}>
        <span className={styles.notVisitedBtn}>{notVisitied}</span>
        <span>Not Visited</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.notAnswered}>{notAnswered}</div>
        <span>Not Answered</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.answered}>{answered}</div>
        <span>Answered</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.markForReview}>{markedForReview}</div>
        <span>Marked for Review</span>
      </div>

      <div className={clsx(styles.subContainer, styles.large)}>
        <div className={styles.answeredAndMarkForReview}>
          {answeredAndMarkedForReview}
        </div>
        <span>
          Answered & Marked for Review (will be considered for evaluation)
        </span>
      </div>
    </div>
  );
};

export default Legend;
