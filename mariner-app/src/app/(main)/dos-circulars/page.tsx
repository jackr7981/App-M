"use client";

import { FileText, Search, Filter, Download } from "lucide-react";
import { useState } from "react";

// Dummy Data Generator
const generateCirculars = () => {
    return Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `DOS Circular No. ${2024 - i} - regarding maritime safety updates and protocols for vessel operations - part ${i + 1}`,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }),
        refNo: `DOS/36.${String(i + 1).padStart(3, "0")}.12.${2023 + (i % 2)}`,
        downloadUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    }));
};

const circulars = generateCirculars();

export default function DOSCircularsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCirculars = circulars.filter((circular) =>
        circular.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        circular.refNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenPdf = (url: string) => {
        window.open(url, "_blank");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6 pb-24 md:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-6 w-6 text-sky-500" />
                        DOS Circulars
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Department of Shipping, Bangladesh - Latest Updates
                    </p>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sticky top-4 z-10 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search circulars by title or reference number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white placeholder:text-slate-500"
                    />
                </div>
            </div>

            {/* Circulars List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCirculars.map((circular) => (
                        <div
                            key={circular.id}
                            onClick={() => handleOpenPdf(circular.downloadUrl)}
                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400">
                                            {circular.refNo}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {circular.date}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-medium text-slate-900 dark:text-slate-200 group-hover:text-sky-500 transition-colors line-clamp-2">
                                        {circular.title}
                                    </h3>
                                </div>
                                <div className="flex-shrink-0">
                                    <button className="p-2 text-slate-400 hover:text-sky-500 transition-colors">
                                        <Download className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredCirculars.length === 0 && (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            No circulars found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
