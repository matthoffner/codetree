import React, { useMemo, useRef, useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useChat, Message } from "ai/react";
import { FunctionCallHandler, nanoid } from "ai";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  compiler_state,
  initEsbuild,
} from "../../store/features/compilerSlice";
import { editor_state, set_monaco_input_value, update_editor_code } from "../../store/features/editorSlice";
import { theme_state } from "../../store/features/themeSlice";
import { ModalEnum, open_modal } from "../../store/features/modalSlice";

import ConsoleLog from "./ConsoleLog";
import Iframe from "./Iframe";
import InputCodeTab from "./InputCodeTab";
import Footer from "./Footer";
import Pane from "./Pane";
import { SendIcon } from "../../constants/icon";
import ReactMarkdown from "react-markdown";

const Playground = () => {
  const dispatch = useAppDispatch();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useAppSelector(theme_state);
  const { esbuildStatus, isCompiling, output } = useAppSelector(compiler_state);
  const { logs, editorValue, isLogTabOpen } = useAppSelector(editor_state);
  const [markdownCode, setMarkdownCode] = useState('');
  const [prevMarkdownCode, setPrevMarkdownCode] = useState(markdownCode);

  const isValidCodeBlock = (markdownCode: string) => {
    return markdownCode && markdownCode.length > 10 && markdownCode.includes('\n');
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (isValidCodeBlock(markdownCode) && markdownCode !== prevMarkdownCode) {
        dispatch(update_editor_code({ type: 'javascript', content: markdownCode }));
        setPrevMarkdownCode(markdownCode);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
    };
  }, [markdownCode, prevMarkdownCode, dispatch]);


  const { messages, input, setInput, handleSubmit } = useChat({
    onError: (error) => {
      console.error(error);
    },
  });

  useEffect(() => {
    if (!esbuildStatus.isReady) {
      dispatch(initEsbuild());
    }
  }, [dispatch, esbuildStatus]);

  useEffect(() => {
    dispatch(open_modal(ModalEnum.TEMPLATE));
  }, [dispatch]);

  useEffect(() => {
    if(isValidCodeBlock(markdownCode)) {
      const newEditorValue = {
        name: "React",
        description: "By codetree",
        public: true,
        iconSrc: "/icons/reactjs.svg",
        tabs: {
          javascript: {
            title: "JS/JSX",
            entryPoints: "index.js",
            monacoLanguage: "javascript",
            data: markdownCode
          },
          html: {
            title: "index.html",
            entryPoints: "index.html",
            monacoLanguage: "html",
            data: ""
          },
          css: {
            title: "main.css",
            entryPoints: "main.css",
            monacoLanguage: "css",
            data: ""
          }
        }
      };
      
      dispatch(set_monaco_input_value(newEditorValue as any));
    }
  }, [markdownCode, dispatch]);

  return (
    <div style={{ background: theme.background }}>
      <div className="flex flex-col">
        <div className="px-4 pb-2 pt-3 shadow-lg sm:pb-3 sm:pt-4">
          <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="relative w-full"
            >
            <textarea ref={inputRef} onChange={(e) => setInput(e.target.value)}
              placeholder="Chat with GPT-4 and code blocks will automatically render in the editor! Codetree uses WebAssembly and Esbuild to compile in the browser."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  formRef.current?.requestSubmit();
                  e.preventDefault();
                }
              }}
              spellCheck={false} className="textarea" value={input} />
            <button 
                type="submit"
                className="absolute inset-y-0 right-3 my-auto flex h-8 w-8 items-center justify-center rounded-md transition-all"
            >
              <SendIcon
                  className={"h-4 w-4"}
              />
            </button>
          </form>
        </div>
        <div className="flex flex-col items-start space-y-4 overflow-y-auto max-h-[20vh]">
          {messages?.map((message, index) => (
            <p key={index} className="messages-text">
              <ReactMarkdown
                className="prose mt-1 w-full break-words prose-p:leading-relaxed" 
                components={{
                  a: (props) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                  // @ts-ignore
                  code: ({node, ...props}) => {
                    const codeValue = props.children[0] || '';
                    setMarkdownCode(codeValue as any);
                    
                    return null;
                  }                    
                }}
              >
                {message.content}
              </ReactMarkdown>
            </p>
          ))}
        </div>
      </div>
      <Pane
        panelA={<InputCodeTab editorValue={editorValue} />}
        panelB={
          <Iframe
            tabs={editorValue.tabs}
            output={output}
            isCompiling={isCompiling}
            esbuildStatus={esbuildStatus}
          />
        }
        panelC={<ConsoleLog logs={logs} />}
        lastPanelVisibility={isLogTabOpen}
      />

      <Footer />
    </div>

  );
};

export default Playground;
