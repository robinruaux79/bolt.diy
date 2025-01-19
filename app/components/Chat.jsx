import { useChat } from 'ai/react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { useEffect, useMemo, useRef, useState } from 'react';

import "./Chat.scss"
import Button from './Button.jsx';
import { Trans } from 'react-i18next';
import Markdown from 'react-markdown';
import { CodeBlock, dracula } from 'react-code-blocks';
import { FaEdit, FaFile } from 'react-icons/fa';

const REGEXP_CODE = new RegExp("```([^`]*)```", "g");
export const Chat = ({project}) => {

  const [files, setFiles] = useState([]);
  const apiKeys = [];
  const promptId = 'e';
  const contextOptimizationEnabled = false;
  const initialMessages = [];

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
    onFinish: async (message, response) => {
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

      console.log('Finished streaming');
    },
    initialMessages
  });

  const [prompt, setPrompt] = useState();

  const handleNewMessage = () => {
    setMessages([...messages,
      {
        id: `${new Date().getTime()}`,
        role: 'user',
        content: prompt ? prompt : (messages.length > 0 ? 'Analyse la prochaine étape et code tout que tu peux améliorer de façon détaillée (crée/édite aussi la TODO.md si tu as finalisé l\'étape)' : 'Etonne-moi, fier codeur !'),
      }]);
    reload();
    setPrompt('');
  }

  const chatRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
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
  return <div className="chat">

    <div className="chat-messages">
      {memMessages}
    </div>
    <div className="chat-prompt" ref={chatRef}>
    <textarea
      placeholder="Demandez à l'IA de vous créer un outil, de faire une recherche sur le web, ou de persister des données..."
      rows={8} value={prompt} onChange={e => setPrompt(e.target.value)}>
    </textarea>
      <Button onClick={handleNewMessage}><Trans i18nKey="links.generate">Continuer</Trans></Button>
    </div>
  </div>
};
