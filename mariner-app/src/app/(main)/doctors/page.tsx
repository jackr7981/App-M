"use client";

import { Search, MapPin, Phone, Star, ShieldCheck } from "lucide-react";
import { useState } from "react";

const doctors = [
    {
        id: 1,
        name: "Dr. A.K.M. Fazlul Haque",
        specialty: "Approved Medical Examiner",
        location: "Chattogram Port Area",
        phone: "+880 1711-000000",
        rating: 4.8,
        reviews: 124,
        image: "bg-blue-100",
    },
    {
        id: 2,
        name: "Dr. Sarah Ahmed",
        specialty: "D.G. Shipping Approved",
        location: "Dhaka, Motijheel",
        phone: "+880 1811-000000",
        rating: 4.9,
        reviews: 89,
        image: "bg-emerald-100",
    },
    {
        id: 3,
        name: "Dr. Rafiqul Islam",
        specialty: "General Physician & Marine Health",
        location: "Mongla Port",
        phone: "+880 1911-000000",
        rating: 4.6,
        reviews: 56,
        image: "bg-amber-100",
    },
    {
        id: 4,
        name: "Dr. Nusrat Jahan",
        specialty: "Seafarer Medical Officer",
        location: "Chattogram, Agrabad",
        phone: "+880 1611-000000",
        rating: 4.7,
        reviews: 210,
        image: "bg-rose-100",
    },
    {
        id: 5,
        name: "Dr. Kamal Hossain",
        specialty: "Approved Medical Practitioner",
        location: "Narayanganj",
        phone: "+880 1511-000000",
        rating: 4.5,
        reviews: 45,
        image: "bg-purple-100",
    },
];

export default function DoctorsPage() {
    const [search, setSearch] = useState("");

    const filteredDoctors = doctors.filter(
        (doc) =>
            doc.name.toLowerCase().includes(search.toLowerCase()) ||
            doc.location.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Authorized Doctors
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Find D.G. Shipping approved medical examiners.
                </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
            </div>

            {/* Doctors List */}
            <div className="space-y-4">
                {filteredDoctors.map((doc) => (
                    <div
                        key={doc.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-sky-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30 sm:flex-row"
                    >
                        {/* Avatar / Image Placeholder */}
                        <div
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl sm:h-20 sm:w-20 ${doc.image}`}
                        >
                            <ShieldCheck className="h-8 w-8 text-slate-600/50" />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                        {doc.name}
                                    </h3>
                                    <p className="text-xs font-medium text-sky-600 dark:text-sky-400">
                                        {doc.specialty}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                                    <Star className="h-3 w-3 fill-current" />
                                    {doc.rating}
                                </div>
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <MapPin className="h-4 w-4 shrink-0" />
                                {doc.location}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 flex gap-3">
                                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-50 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20">
                                    <Phone className="h-4 w-4" />
                                    Call
                                </button>
                                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                                    <MapPin className="h-4 w-4" />
                                    Map
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredDoctors.length === 0 && (
                    <div className="py-10 text-center text-slate-500">
                        No doctors found matching "{search}".
                    </div>
                )}
            </div>
        </div>
    );
}
