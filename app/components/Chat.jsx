import { useChat } from 'ai/react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { useEffect, useRef, useState } from 'react';

import "./Chat.scss"
import Button from './Button.jsx';
import { Trans } from 'react-i18next';
import Markdown from 'react-markdown';
import { CodeBlock, dracula } from 'react-code-blocks';
import { FaEdit, FaFile } from 'react-icons/fa';

export const Chat = () => {

  const apiKeys = [];
  const files = [];
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

      // handle markdown JSON commands and returns the actions traces
      try {
        const res = await fetch('/api/actions', {
          headers: {
            "Content-Type": "application/json",
          },
          method: 'POST',
          body: JSON.stringify({message})
        });
        if( res.ok ){
          const json = await res.json();
          console.log(json.actions);
        }
      } catch (e){

      }

      console.log('Finished streaming');
    },
    initialMessages
  });

  const [prompt, setPrompt] = useState();

  console.log(messages)
  const handleNewMessage = () => {
    setMessages([...messages,
      {
        id: `${new Date().getTime()}`,
        role: 'user',
        content: prompt,
      }]);
    reload();
    setPrompt('');
  }

  const chatRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return <div className="chat">
    <div className="chat-prompt">
    <textarea
      placeholder="Demandez à l'IA de vous créer un outil, de faire une recherche sur le web, ou de persister des données..."
      rows={8} value={prompt} onChange={e => setPrompt(e.target.value)}>
    </textarea>
    <Button onClick={handleNewMessage}><Trans i18nKey="links.generate">Générer</Trans></Button>
  </div>
    <div className="chat-messages" ref={chatRef}>
      {messages.map(message => {
        let json;
        if( message.role === 'assistant'){
          try {
            json = JSON.parse(message.content);
          }catch (e) {

          }
        }
        /*
          js.editions?.forEach(ev => {
            let txt = '';
            if( !ev.old_content && ev.old_line ){
              txt = lines[ev.old_line-1];
              lines.splice(ev.old_line-1, 1);
            }else{

            }
            html = html + (ev.old_line ? ev.old_line + ":" : "") + "<div style='color:red'>-" +(txt || ev.old_content) + "</div><div style='color:green'>" + ev.new_content + "</div><br />";
          })
          setJsonHtml(html);
          console.log(lines.join("\n"), js.file);
          await workbenchStore.filesStore.saveFile(js.file, [...lines].join("\n"));
          workbenchStore.removeFromUnsaved(js.file);
          workbenchStore.showWorkbench.set(true);
        setHTML(await codeToHtml(code, { lang: language, theme }));*/

        console.log(json, message.content)
        if( Array.isArray(json?.actions) ){
          return json?.actions.map(action=>{
          if( action.cmd === 'ANALYSIS' )
            return <div className="msg msg-analysis">
              <Markdown html>{action.content}</Markdown>
            </div>
          if (action.cmd === 'CREATE_FILE' || action.cmd === 'EDIT_FILE')
              return <div className="msg msg-code">
                {action.cmd === "CREATE_FILE" ? <FaFile /> : <FaEdit/>}<b>{action.file}</b> ({action.language})<br/>
                <CodeBlock
                  text={action.content}
                  language={action.language}
                  showLineNumbers
                  theme={dracula}
                />
              </div>
          return <div className="msg msg-code"><CodeBlock text={JSON.stringify(action)} language={'JavaScript'}
                                                          theme={dracula} /></div>})
            }
            return <div className={`msg msg-${message.role}`}>
          <div dangerouslySetInnerHTML={{ __html: message.content }} />
        </div>
      })}
    </div>
  </div>
};
