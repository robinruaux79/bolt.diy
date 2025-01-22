import { useChat } from 'ai/react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import "./Chat.scss"
import Button from './Button.jsx';
import { Trans } from 'react-i18next';
import Markdown from 'react-markdown';
import { CodeBlock, dracula } from 'react-code-blocks';
import { FaBars, FaBook, FaEdit, FaFile, FaMinus, FaPlay, FaRunning, FaStop } from 'react-icons/fa';
import { FaLinesLeaning } from 'react-icons/fa6';
import { TextField } from '../Field.jsx';
import ThreadsModal from './ThreadsModal.jsx';
import { DialogProvider } from './Dialog.jsx';

const REGEXP_CODE = new RegExp("```([^`]*)```", "g");
export const Chat = ({project}) => {

  const [isRunning, setIsRunning] = useState(false);
  const promptDefault = 'Analyse la prochaine étape et code tout que tu peux améliorer de façon détaillée (crée/édite aussi la TODO.md si tu as finalisé l\'étape)';
  const [files, setFiles] = useState([]);
  const apiKeys = [];
  const promptId = 'e';
  const contextOptimizationEnabled = false;
  const initialMessages = [];

  const [isFinishedTriggered, setFinishedTriggered] = useState(false);
  const onFinish = async (message, response) => {
    const usage = response.usage;

    let jsonData;
    try {
      jsonData = JSON.parse(message.content);
    } catch (e) {

    }
    if( jsonData && !jsonData.actions ) {
      jsonData = {actions: [jsonData]}
    }

    // handle markdown JSON commands and returns the actions traces
    try {
      const res = await fetch('/api/project/'+project.hash+'/actions', {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify({actions: jsonData.actions})
      });
      if( res.ok ){
        const json = await res.json();
        console.log(json.actions);
      }
    } catch (e){
      console.log("error", e)
    }

      setFinishedTriggered(true);
    console.log('Finished streaming');
  };


    // send message when running
  useEffect(() => {
    if( isFinishedTriggered && isRunning ){
      setMessages(messages => [...messages,
        {
          id: `${new Date().getTime()}`,
          role: 'user',
          content: promptDefault,
        }]);
      reload();
      setFinishedTriggered(false);
    }
  }, [isFinishedTriggered, isRunning]);

  const { messages, isLoading, input, handleInputChange, setInput, stop, append, setMessages, reload } = useChat({
    api: '/api/chat',
    body: {
    },
    sendExtraMessageFields: true,
    onError: (error) => {
      console.log('Request failed\n\n', error);
      toast.error(
        'There was an error processing your request: ' + (error.message ? error.message : 'No details were returned'),
      );
    },
    onFinish: onFinish,
    initialMessages
  });

  const [prompt, setPrompt] = useState();
  const [filesUpdated, setFilesUpdated] = useState(true);
  const handleNewMessage = () => {

    const listFiles = (project.files ||[]).join('\n');
    const fileMsg = {
        id: `a-${new Date().getTime()}`,
        role: 'user',
        content: 'La liste des fichiers du projet est : \n' + listFiles
    };
    setFilesUpdated(false);

    const msgs = [...messages,
      {
        id: `b-${new Date().getTime()}`,
        role: 'user',
        content: prompt ? prompt : (messages.length > 0 ? promptDefault : 'Etonne-moi, fier codeur !'),
      }];
    if( project.files.length ) {
      msgs.push(fileMsg);
    }
    setMessages(msgs);
    reload();
    setPrompt('');
  }

  const chatRef = useRef(null);

  useEffect(() => {
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
    //window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const memMessages = useMemo(() => {
    return messages?.map(message => {
      let json;
      if( message.role === "system")
        return <></>;
      if (message.role === 'assistant') {
        try {
          json = JSON.parse(message.content);
          console.log("JSON parsed", json)
        } catch (e) {
          console.log("JSON parsed", message.content)
        }
      }
      if( json && !json.actions ) {
        json = {actions: [json]};
      }
      if (Array.isArray(json?.actions)) {
        return json?.actions.map(action => {
          let html = action.content;
          if( action.cmd === 'EDIT_FILE' ){
            const lines = files.find(f => f.file === action.file)?.content?.split("\n") || [];
            html = '';
            let ind = 0;
            action.editions?.forEach(ev => {
              let txt = '';
              const start_line = parseInt(ev.start_line, 10);
              if (ev.insert_content){
                lines.splice(start_line-1, 0, ev.insert_content);
                ind-=(ev.insert_content.split("\n").length+1);
              } else if (ev.new_content){
                lines.splice(start_line-1, 0, ev.new_content);
                ind-=(ev.new_content.split("\n").length+1);
              } else if( start_line && lines ){
                txt = lines[start_line-1-ind];
                lines.splice(start_line-1, 1);
              }

              if( ev.insert_content !== undefined ) {
                html += "+l" + start_line + " : " + ev.insert_content + "\n";
              }
              else if( ev.new_content ) {
                html += "-l" + start_line + " : " + lines[start_line - 1] + "\n";
                html += "+l" + start_line + " : " + ev.new_content + "\n";
              }
              else
                html += "-l"+start_line + " : " + txt+"\n";

            })
          }
          if (action.cmd === 'ANALYSIS')
            return <div className="msg msg-analysis">
              <Markdown html>{action.content}</Markdown>
            </div>
          if (action.cmd === 'CREATE_FILE')
            return <div className="msg msg-code">
              {action.cmd === "CREATE_FILE" ? <FaFile /> : <FaEdit />}<b>{action.file}</b> ({action.language})<br />
              <CodeBlock
                text={html}
                language={action.language}
                showLineNumbers
                theme={dracula}
              />
            </div>
          if( action.cmd === 'EDIT_FILE'){
            return <><FaEdit /><b>{action.file}</b><br />
              <CodeBlock
                text={html}
                language={"PlainText"}
                showLineNumbers={false}
                theme={dracula}
              /></>
          }
          return <div className="msg msg-code"><CodeBlock text={JSON.stringify(action)} language={'plaintext'}
                                                          theme={dracula} /></div>
        })
      }
      return <div className={`msg msg-${message.role}`}>
        <Markdown>{message.content}</Markdown>
      </div>
    })
  }, [messages])

  const [promptSearch, setPromptSearch] = useState('');
  const [showThreadModal, setThreadModalVisible] = useState(false);

  return <div className="chat">
    <DialogProvider>
      {showThreadModal && <ThreadsModal threads={project.threads ||[]} onClose={() => setThreadModalVisible(false)} />}
    </DialogProvider>
    <div className="chat-messages" ref={chatRef}>
      {memMessages}
    </div>
    <div className="chat-prompt">
      <div className={"actions"}>
        <div className="field-iconed">
          <TextField value={promptSearch} onChange={e => setPromptSearch(e.target.value)} />
          <FaBook title={"Prompts"} />
        </div>
        <FaBars onClick={() => setThreadModalVisible(true)} title="Threads"/>
        {!isRunning && <FaPlay onClick={() => setIsRunning(true)} title="Start autoplay"/>}
        {isRunning && <FaStop onClick={() => setIsRunning(false)} title="Stop autoplay"/>}
      </div>
      <textarea
      placeholder="Demandez à l'IA de vous créer un outil, de faire une recherche sur le web, ou de persister des données..."
      rows={8} value={prompt} onChange={e => setPrompt(e.target.value)}>
    </textarea>
      <Button onClick={handleNewMessage}><Trans i18nKey="links.generate">Continuer</Trans></Button>
    </div>
  </div>
};
