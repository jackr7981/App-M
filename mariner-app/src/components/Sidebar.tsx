"use client";

import {
    Home,
    Ship,
    Scroll,
    FileText,
    Shield,
    Stethoscope,
    User,
    Upload,
    X,
    LogOut
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUI } from "@/context/UIContext";
import { useEffect } from "react";

const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Vessels", href: "/vessels", icon: Ship },
    { name: "DOS Circulars", href: "/dos-circulars", icon: Scroll },
    { name: "Documents", href: "/folders/medical", icon: FileText },
    { name: "Certificates", href: "/folders/certificates", icon: Shield },
    { name: "Doctors", href: "/doctors", icon: Stethoscope },
    { name: "Profile", href: "/profile", icon: User },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { isSidebarOpen, setSidebarOpen, setUploadOpen } = useUI();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname, setSidebarOpen]);

    return (
        <>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full",
                className
            )}>
                {/* Header */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/50">
                    <div className="flex items-center">
                        <Shield className="h-8 w-8 text-sky-500" />
                        <span className="ml-3 text-lg font-bold tracking-tight text-slate-50">
                            Mariners<span className="text-sky-500">BD</span>
                        </span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden text-slate-400 hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Upload Action */}
                <div className="p-4">
                    <button
                        onClick={() => {
                            setUploadOpen(true);
                            setSidebarOpen(false);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-blue-500 hover:shadow-sky-500/40 active:scale-[0.98]"
                    >
                        <Upload className="h-5 w-5" />
                        Upload Document
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
                    <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Menu
                    </div>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-sky-500/10 text-sky-400"
                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                        isActive ? "text-sky-400" : "text-slate-500 group-hover:text-white"
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User / Footer */}
                <div className="border-t border-slate-800/50 p-4">
                    <div className="flex items-center gap-3 rounded-xl bg-slate-900/50 p-3 hover:bg-slate-900 transition-colors cursor-pointer group">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sky-400 to-emerald-400 ring-2 ring-slate-950 group-hover:ring-sky-500/50 transition-all" />
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-white">Captain Rafsun</p>
                            <p className="truncate text-xs text-slate-500 group-hover:text-sky-400 transition-colors">rafsun@mariners.bd</p>
                        </div>
                        <LogOut className="h-5 w-5 text-slate-500 hover:text-red-400 transition-colors" />
                    </div>
                </div>
            </div>
        </>
    );
}
