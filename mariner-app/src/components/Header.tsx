"use client";

import { Bell, Search, Menu } from "lucide-react";
import { useUI } from "@/context/UIContext";

export function Header() {
    const { setSidebarOpen } = useUI();

    return (
        <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 md:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex w-full items-center gap-4">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="flex w-full max-w-sm items-center rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-900">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="ml-2 w-full bg-transparent text-sm text-slate-900 placeholder-slate-500 focus:outline-none dark:text-white"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <button className="relative rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-950" />
                </button>
            </div>
        </header>
    );
}
