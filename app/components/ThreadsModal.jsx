import React from 'react';
import { Dialog } from './Dialog.jsx';

import './Dialog.scss';
const ThreadsModal = ({ threads, onClose }) => {
  return (
    <Dialog isModa onClose={onClose} l isClosable title={"Threads"}>
     <p>Vos threads pour ce projet :</p>
      <ul>
        {threads.map((thread, index) => (
          <li key={index}>{thread.name}</li>
        ))}
      </ul>
    </Dialog>
  );
};

export default ThreadsModal;
