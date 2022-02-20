import { useEffect, useRef } from "react";
import clsx from "clsx";
import styles from "./Modal.module.scss";
import { Button } from "..";

interface ModalProps {
  isOpen: boolean;
  title: string;
  backdrop?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnClickOutside?: boolean;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  backdrop,
  children,
  footer,
  onClose,
  closeOnClickOutside = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.classList.add(styles.modalOpen);
    } else {
      modalRef.current?.classList.remove(styles.modalOpen);
    }
  }, [isOpen]);

  return (
    <div
      ref={modalRef}
      className={clsx(styles.container, backdrop ? styles.backdrop : "")}
      onClick={closeOnClickOutside ? onClose : undefined}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{title}</h3>
          <Button icon={<>x</>} type="button" onClick={onClose}>
            ""
          </Button>
        </div>
        <div className={styles.content}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
