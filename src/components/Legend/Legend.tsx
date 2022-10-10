import clsx from "clsx";
import styles from "./Legend.module.scss";

interface Props {
  status: {
    notVisited: Array<string>;
    notAnswered: Array<string>;
    answered: Array<string>;
    markedForReview: Array<string>;
    answeredAndMarkedForReview: Array<string>;
  };
}

const Legend: React.FC<Props> = ({ status }) => {
  const {
    notVisited,
    notAnswered,
    answered,
    markedForReview,
    answeredAndMarkedForReview,
  } = status;

  return (
    <div className={styles.container}>
      <div className={styles.subContainer}>
        <span className={styles.notVisitedBtn}>{notVisited.length}</span>
        <span>Not Visited</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.notAnswered}>{notAnswered.length}</div>
        <span>Not Answered</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.answered}>{answered.length}</div>
        <span>Answered</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.markForReview}>{markedForReview.length}</div>
        <span>Marked for Review</span>
      </div>

      <div className={clsx(styles.subContainer, styles.large)}>
        <div className={styles.answeredAndMarkForReview}>
          {answeredAndMarkedForReview.length}
        </div>
        <span>
          Answered & Marked for Review (will be considered for evaluation)
        </span>
      </div>
    </div>
  );
};

export default Legend;
