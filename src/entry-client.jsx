import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../app/App'
import {BrowserRouter} from "react-router-dom";

ReactDOM.hydrateRoot(
    document.getElementById('root'),
        <BrowserRouter>
            <App />
        </BrowserRouter>
)
