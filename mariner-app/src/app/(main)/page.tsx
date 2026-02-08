"use client";

import { Folder, MoreVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useUI } from "@/context/UIContext";

const categories = [
    { name: "Certificates of Competency", count: 12, color: "bg-blue-500", href: "/folders/certificates" },
    { name: "CDC & Seaman Book", count: 4, color: "bg-emerald-500", href: "/folders/cdc" },
    { name: "Passport & Visa", count: 3, color: "bg-purple-500", href: "/folders/passport" },
    { name: "Medical Reports", count: 8, color: "bg-rose-500", href: "/folders/medical" },
    { name: "Training Records", count: 15, color: "bg-amber-500", href: "/folders/training" },
    { name: "Service Testimonials", count: 6, color: "bg-cyan-500", href: "/folders/service" },
];

export default function Dashboard() {
    const { setUploadOpen } = useUI();

    return (
        <div className="mx-auto max-w-6xl">
            {/* Welcome Section */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Document Vault
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage and access your maritime documents securely.
                    </p>
                </div>
                <button
                    onClick={() => setUploadOpen(true)}
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Document
                </button>
            </div>

            {/* Categories Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                    <Link
                        key={category.name}
                        href={category.href}
                        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:shadow-lg hover:border-sky-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/50"
                    >
                        <div className="flex items-start justify-between">
                            <div className={`rounded-lg p-3 ${category.color} bg-opacity-10 text-${category.color.replace("bg-", "")} text-white`}>
                                <Folder className="h-6 w-6" />
                            </div>
                            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4">
                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-sky-500 dark:text-white dark:group-hover:text-sky-400">
                                {category.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {category.count} items
                            </p>
                        </div>

                        {/* Decorative Gradient Blob */}
                        <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full ${category.color} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
                    </Link>
                ))}
            </div>

            {/* Recent Uploads Section (Placeholder) */}
            <div className="mt-10">
                <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                    Recent Activity
                </h2>
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <p>No recent activity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
