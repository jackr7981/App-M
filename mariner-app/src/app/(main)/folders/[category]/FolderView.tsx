"use client";

import { FileText, MoreVertical, Search, ArrowLeft, Filter } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Dummy data generator
const generateDocuments = (category: string) => {
    return Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Document ${i + 1}.pdf`,
        date: `2024-0${Math.floor(Math.random() * 9) + 1}-1${i}`,
        size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
        type: "PDF",
    }));
};

export function FolderView({ category }: { category: string }) {
    const documents = generateDocuments(category);
    const [search, setSearch] = useState("");

    const filteredDocs = documents.filter(doc =>
        doc.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="mx-auto max-w-5xl">
            {/* Header Section */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="rounded-full bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold capitalize text-slate-900 dark:text-white">
                            {category.replace("-", " ")}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {filteredDocs.length} files
                        </p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search in this folder..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                </div>
                <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Filter className="h-4 w-4" />
                    Filter
                </button>
            </div>

            {/* File List */}
            <div className="space-y-3">
                {filteredDocs.map((doc) => (
                    <div
                        key={doc.id}
                        className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-sky-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">
                                    {doc.name}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span>{doc.date}</span>
                                    <span>•</span>
                                    <span>{doc.size}</span>
                                </div>
                            </div>
                        </div>

                        <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                            <MoreVertical className="h-5 w-5" />
                        </button>
                    </div>
                ))}
                {filteredDocs.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        No documents found.
                    </div>
                )}
            </div>
        </div>
    );
}
