import Button from "./Button.jsx";
import { FaWindowClose } from "react-icons/fa";

import "./Dialog.scss";
import { createContext, useContext, useEffect, useState } from "react";
import { add } from "date-fns";

const DialogContext = createContext({});

export const useDialogContext = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState(0);
  const values = {
    addDialog: () => setDialogs((dialogs) => dialogs + 1),
    removeDialog: () =>
      setDialogs((dialogs) => {
        return dialogs > 0 ? dialogs - 1 : 0;
      }),
  };
  return (
    <DialogContext.Provider value={values}>
      {dialogs > 0 ? (
        <>
          <div className="dialog-bg"></div>
          {children}
        </>
      ) : (
        children
      )}
    </DialogContext.Provider>
  );
};
export const Dialog = ({
  title,
  children,
  className,
  onClose,
  isClosable,
  isModal,
}) => {
  const [showModal, setModalVisible] = useState(true);
  const { addDialog, removeDialog } = useDialogContext();
  const handleClose = () => {
    setModalVisible(false);
    onClose?.();
    removeDialog();
  };
  useEffect(() => {
    if (showModal) addDialog();
    else removeDialog();
  }, [showModal]);

  useEffect(() => {
    return () => removeDialog();
  }, []);
  return showModal ? (
    <div
      className={`${className ? className : ""} dialog ${isModal ? "dialog-modal" : ""}`}
    >
      <div className="dialog-header">
        {title && <h2>{title}</h2>}
        {isClosable && (
          <Button onClick={handleClose}>
            <FaWindowClose />
          </Button>
        )}
      </div>
      <div className="dialog-content">{children}</div>
    </div>
  ) : (
    <></>
  );
};
