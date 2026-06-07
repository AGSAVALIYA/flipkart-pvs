import React from 'react';
type Theme = 'light';
interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}
export declare const ThemeProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare function useTheme(): ThemeContextValue;
export {};
