import React, {lazy, Suspense, useState} from "react";
import {QueryClient, QueryClientProvider} from 'react-query'
import './App.scss'
import {NavLink, Outlet, Route, Routes, useNavigate} from "react-router-dom";

import {Trans} from "react-i18next";

import "./i18n.js"

const queryClient = new QueryClient()

import { usePreferredColorScheme} from "./hooks.js";
import { Chat } from './components/Chat.jsx';
import { Project } from './Project.jsx';

const PrimalsBar = lazy(
    () => import("../../primals/src/components/sso/PrimalsBar.jsx"),
);

function App() {
    const date = new Date();
    const navigate = useNavigate();
    const theme = usePreferredColorScheme();

    const [resetTime, setResetTime] = useState(0);
    const bar = (
        <Suspense>
            <PrimalsBar
                title={
                    <span>
            <a href={"https://gen.primals.net/"} className="title">
              gen
            </a>
            .
            <a href="https://primals.net/" className="title">
              primals.net
            </a>
          </span>
                }
                slogan={<></>}
                onAuthenticated={(me) => {
                }}
                onDisconnected={() => {

                }}
                userLinks={[]}
                widgets={[]}
            />
        </Suspense>
    );
    return <QueryClientProvider client={queryClient}>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NS94ZLLZ" height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
        <div className={theme}>
            <div className="foreground">
                {bar}
                <div className="website-content">
                    <main>
                        <Routes>
                            <Route path="/" element={<Outlet />}>
                              <Route path="" element={<Project></Project>} />
                            </Route>
                        </Routes>
                    </main>
                </div>
            </div>
        </div>
    </QueryClientProvider>
}


export default App
