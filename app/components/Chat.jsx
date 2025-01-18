import { useChat } from 'ai/react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { useState } from 'react';

import "./Chat.scss"
import Button from './Button.jsx';
import { Trans } from 'react-i18next';

export const Chat = () => {

  const apiKeys = [];
  const files = [];
  const promptId = 'e';
  const contextOptimizationEnabled = false;
  const initialMessages = [];

  const { messages, isLoading, input, handleInputChange, setInput, stop, append, setMessages, reload } = useChat({
    api: '/api/chat',
    body: {
      apiKeys,
      files,
      promptId,
      contextOptimization: contextOptimizationEnabled,
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

      if (usage) {
        console.log('Token usage:', usage);

        // You can now use the usage data as needed
      }

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
  return <div className="chat-prompt">
    <textarea
      placeholder="Demandez à l'IA de vous créer un outil, de faire une recherche sur le web, ou de persister des données..."
      rows={8} value={prompt} onChange={e => setPrompt(e.target.value)}>
    </textarea>
    <Button onClick={handleNewMessage}><Trans i18nKey="links.generate">Générer</Trans></Button>
  </div>
};
