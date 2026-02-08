import { User, Mail, Shield, Bell, Lock, LogOut, ChevronRight, type LucideIcon } from "lucide-react";

interface ProfileItem {
    icon: LucideIcon;
    label: string;
    value?: string;
    toggle?: boolean;
}

interface ProfileSection {
    title: string;
    items: ProfileItem[];
}

const sections: ProfileSection[] = [
    {
        title: "Account",
        items: [
            { icon: User, label: "Personal Information", value: "Captain Rafsun" },
            { icon: Mail, label: "Email Address", value: "rafsun@mariner.bd" },
            { icon: Shield, label: "Rank / Designation", value: "Master Mariner" },
        ],
    },
    {
        title: "Settings",
        items: [
            { icon: Bell, label: "Notifications", toggle: true },
            { icon: Lock, label: "Security & Privacy" },
        ],
    },
];

export default function ProfilePage() {
    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
                Profile
            </h1>

            {/* User Header */}
            <div className="mb-8 flex items-center gap-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-8 text-white shadow-lg">
                <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm" />
                <div>
                    <h2 className="text-xl font-bold">Captain Rafsun</h2>
                    <p className="text-sky-100">Master Mariner • ID: 882910</p>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-6">
                {sections.map((section) => (
                    <div key={section.title}>
                        <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {section.title}
                        </h3>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            {section.items.map((item, i) => (
                                <div
                                    key={item.label}
                                    className={`flex items-center justify-between p-4 ${i !== section.items.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {item.label}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {item.value && (
                                            <span className="text-sm text-slate-500">{item.value}</span>
                                        )}
                                        {item.toggle ? (
                                            <div className="h-6 w-11 rounded-full bg-sky-500 p-1">
                                                <div className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform translate-x-5" />
                                            </div>
                                        ) : (
                                            !item.value && <ChevronRight className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 font-medium text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
