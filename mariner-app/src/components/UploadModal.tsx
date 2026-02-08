"use client";

import { X, UploadCloud, FileType } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function UploadModal() {
    const { isUploadOpen, setUploadOpen } = useUI();
    const [isDragging, setIsDragging] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setUploadOpen(false);
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [setUploadOpen]);

    if (!isUploadOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={() => setUploadOpen(false)}
            />

            {/* Modal View */}
            <div className="relative w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl transition-transform animate-in slide-in-from-bottom-full sm:rounded-2xl dark:bg-slate-900">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Upload Document
                    </h2>
                    <button
                        onClick={() => setUploadOpen(false)}
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drag Drop Zone */}
                <div
                    className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors",
                        isDragging
                            ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
                            : "border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
                >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-500 dark:bg-sky-500/20">
                        <UploadCloud className="h-8 w-8" />
                    </div>
                    <p className="mt-4 text-center text-sm font-medium text-slate-900 dark:text-white">
                        <span className="text-sky-500">Click to upload</span> or drag and drop
                    </p>
                    <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                        PDF, PNG, JPG (max. 10MB)
                    </p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {/* Category Select */}
                <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Document Category
                    </label>
                    <select className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                        <option>Certificates of Competency</option>
                        <option>CDC & Seaman Book</option>
                        <option>Passport & Visa</option>
                        <option>Medical Reports</option>
                        <option>Training Records</option>
                    </select>
                </div>

                {/* Action Button */}
                <button className="mt-8 w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
                    Upload File
                </button>
            </div>
        </div>
    );
}
