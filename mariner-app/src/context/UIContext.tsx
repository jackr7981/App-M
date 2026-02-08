"use client";

import React, { createContext, useContext, useState } from "react";

interface UIContextType {
    isUploadOpen: boolean;
    setUploadOpen: (open: boolean) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [isUploadOpen, setUploadOpen] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <UIContext.Provider value={{ isUploadOpen, setUploadOpen, isSidebarOpen, setSidebarOpen }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return context;
}
