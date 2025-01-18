import React, { useState, useEffect } from "react";
import {useLocation} from "react-router-dom";

export function useQuery() {
    const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function usePreferredColorScheme() {
    const [preferredColorScheme, setPreferredColorScheme] = useState("dark");
    useEffect(() => {
        if (!window.matchMedia) {
            setPreferredColorScheme("light");
            return;
        }
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        setPreferredColorScheme(mediaQuery.matches ? "dark" : "light");
        function onChange(event) {
            setPreferredColorScheme(event.matches ? "dark" : "light");
        }
        mediaQuery.addEventListener("change", onChange);
        return () => {
            mediaQuery.removeEventListener("change", onChange);
        };
    }, []);
    return preferredColorScheme;
}