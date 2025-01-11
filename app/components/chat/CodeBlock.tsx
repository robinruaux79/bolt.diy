import { memo, useEffect, useState } from 'react';
import { bundledLanguages, codeToHtml, isSpecialLang, type BundledLanguage, type SpecialLanguage } from 'shiki';
import { classNames } from '~/utils/classNames';
import { createScopedLogger } from '~/utils/logger';

import styles from './CodeBlock.module.scss';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { FilesStore } from '~/lib/stores/files';

const logger = createScopedLogger('CodeBlock');

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: BundledLanguage | SpecialLanguage;
  theme?: 'light-plus' | 'dark-plus';
  disableCopy?: boolean;
}

export const CodeBlock = memo(
  ({ className, code, language = 'plaintext', theme = 'dark-plus', disableCopy = false }: CodeBlockProps) => {
    const [html, setHTML] = useState<string | undefined>(undefined);
    const [json, setJson] = useState<Object | undefined>(undefined);
    const [jsonHtml, setJsonHtml] = useState<string | undefined>(undefined);
    const [copied, setCopied] = useState(false);
    const files = useStore(workbenchStore.files);


    const [filepath, setFilepath] = useState("");
    const [isInputEnabled, setInputEnabled] = useState(false);

    const handleInsert = async () => {
        console.log(files);
        if( !isInputEnabled ){
          setInputEnabled(true);
        }else{
          if( filepath ) {
            await workbenchStore.filesStore.saveFile(filepath, code);
            workbenchStore.showWorkbench.set(true);
          }
          setInputEnabled(false);
        }
    };


    const copyToClipboard = () => {
      if (copied) {
        return;
      }

      navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    useEffect(() => {
      if (language && !isSpecialLang(language) && !(language in bundledLanguages)) {
        logger.warn(`Unsupported language '${language}'`);
      }

      logger.trace(`Language = ${language}`);

      const processCode = async () => {
        let js;
        try { js = JSON.parse(code);} catch (e) { }
        setJson(js);
        console.log(js)
        if( js?.cmd === "EDIT_FILE" ) {
          if( js.new_content){
            if( js.lineToEdit ){
              const file = workbenchStore.filesStore.getFile(js.file);
              if( file ){
                let lines = file.content.split("\n");
                lines.splice(js.lineToEdit, 0, js.new_content);
                await workbenchStore.filesStore.saveFile(js.file, lines.join("\n"));
              }else{
                await workbenchStore.filesStore.saveFile(js.file, js.new_content);
              }
            }else{
              await workbenchStore.filesStore.saveFile(js.file, js.new_content);
            }
            workbenchStore.removeFromUnsaved(js.file);
            workbenchStore.showWorkbench.set(true);
            setJsonHtml(await codeToHtml(js.new_content, { lang: js.language || language, theme }));
          }else{
            if( js.editions ){

              console.log(js)
              const file = workbenchStore.filesStore.getFile(js.file);
              if( file ){
                let lines = file.content.split("\n");

                let str = file.content;
                let html = "";
                let ind = 0;
                console.log("js.editions", js.editions)

                let lns = [...lines];
                try {
                js.editions.forEach(ev => {
                  html = html + (ev.line) + ":" + (ev.type==="delete" ? "<span style='color:red'>-" + ev.content + '</span>' : (ev.content ? "<span style='color:green'>+" + ev.content + '</span>' : '')) + "<br />";
                  if( ev.type === "delete" ){
                    lns.splice(ev.line, 1);
                  }else{
                    lns[ev.line] = ev.content;
                  }
                });
                } catch (e){
                  console.log(e)
                }

                setJsonHtml(html);

                await workbenchStore.filesStore.saveFile(js.file, lns.join("\n"));
              }
            }
          }
        }
        setHTML(await codeToHtml(code, { lang: language, theme }));
      };

      processCode();
    }, [code]);

    if( json?.cmd ){
      return <div className={classNames('relative group text-left', className)}>
        {json.cmd === "ANALYSIS" && <>{json.content}</>}
        {json.cmd === "EDIT_FILE" && json.new_content && <><b><pre>{json.file}</pre></b>
          <div dangerouslySetInnerHTML={{ __html: jsonHtml ?? '' }}></div>
        </>}
        {json.cmd === "EDIT_FILE" && !json.new_content && <><b><pre>{json.file} {json.line && <>(line: {json.line})</>}</pre></b>
          <div dangerouslySetInnerHTML={{ __html: jsonHtml ?? '' }}></div>
        </>}
      </div>;
    }
    return (
      <div className={classNames('relative group text-left', className)}>
        <div
          className={classNames(
            styles.CopyButtonContainer,
            'bg-transparant absolute top-[10px] right-[10px] rounded-md z-10 text-lg flex items-center justify-center opacity-0 group-hover:opacity-100',
            {
              'rounded-l-0 opacity-100': copied,
            },
          )}
        >
          {!disableCopy && (
            <button
              className={classNames(
                'flex items-center bg-accent-500 p-[6px] justify-center before:bg-white before:rounded-l-md before:text-gray-500 before:border-r before:border-gray-300 rounded-md transition-theme',
                {
                  'before:opacity-0': !copied,
                  'before:opacity-100': copied,
                },
              )}
              title="Copy Code"
              onClick={() => copyToClipboard()}
            >
              <div className="i-ph:clipboard-text-duotone"></div>
            </button>
          )}
          {isInputEnabled && (
            <div className={classNames(styles.field)}>
              <input type={"text"} placeholder="filename.ext" name={"inputFilepath"} value={filepath} onChange={e => setFilepath(e.target.value)} />
            </div>
          )}
          <button
            className={classNames(
              'flex items-center bg-accent-500 p-[6px] justify-center before:bg-white before:rounded-l-md before:text-gray-500 before:border-r before:border-gray-300 rounded-md transition-theme',
              {
                'before:opacity-0': true,
                'before:opacity-100': false,
              },
            )}
            title="Create file"
            onClick={handleInsert}
          >
            {isInputEnabled && <div className="i-ph:check-duotone"></div>}
            {!isInputEnabled && <div className="i-ph:file-arrow-up-thin"></div>}
          </button>
        </div>
        <div dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>
      </div>
    );
  },
);
