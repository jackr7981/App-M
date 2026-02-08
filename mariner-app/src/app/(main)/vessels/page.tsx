"use client";

import { Search, Ship, MapPin, Navigation, Anchor } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const vessels = [
    {
        id: "9876543",
        name: "MV TITANIC II",
        type: "Passenger Ship",
        flag: "Bahamas",
        imo: "9876543",
        status: "In Transit",
        destination: "New York, USA",
        eta: "2026-04-15 08:00",
        color: "bg-blue-100 text-blue-600",
    },
    {
        id: "1234567",
        name: "MSG EVER GIVEN",
        type: "Container Ship",
        flag: "Panama",
        imo: "1234567",
        status: "Anchored",
        destination: "Suez Canal, Egypt",
        eta: "2026-02-10 14:30",
        color: "bg-emerald-100 text-emerald-600",
    },
    {
        id: "5558888",
        name: "LNG SPIRIT",
        type: "LNG Tanker",
        flag: "Marshall Islands",
        imo: "5558888",
        status: "Moored",
        destination: "Qatar, Doha",
        eta: "2026-02-05 09:00",
        color: "bg-amber-100 text-amber-600",
    },
    {
        id: "9990001",
        name: "PACIFIC VOYAGER",
        type: "Bulk Carrier",
        flag: "Liberia",
        imo: "9990001",
        status: "In Transit",
        destination: "Shanghai, China",
        eta: "2026-03-22 18:00",
        color: "bg-rose-100 text-rose-600",
    },
];

export default function VesselsPage() {
    const [search, setSearch] = useState("");

    const filteredVessels = vessels.filter(
        (vessel) =>
            vessel.name.toLowerCase().includes(search.toLowerCase()) ||
            vessel.imo.includes(search)
    );

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Vessel Tracker
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Track vessels worldwide by Name or IMO number.
                </p>
            </div>

            {/* Search */}
            <div className="mb-8 relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Enter Vessel Name or IMO..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-base shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
            </div>

            {/* Results */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {filteredVessels.map((vessel) => (
                    <Link
                        key={vessel.id}
                        href={`/vessels/${vessel.id}`}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-sky-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/30"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${vessel.color}`}>
                                    <Ship className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                                        {vessel.name}
                                    </h3>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        IMO: {vessel.imo}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {vessel.flag}
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-medium uppercase text-slate-400">Destination</span>
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    <MapPin className="h-3.5 w-3.5 text-sky-500" />
                                    {vessel.destination}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[10px] font-medium uppercase text-slate-400">Status</span>
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    <Anchor className="h-3.5 w-3.5 text-slate-400" />
                                    {vessel.status}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {filteredVessels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <Ship className="mb-4 h-12 w-12 text-slate-300" />
                    <p>No vessels found matching your search.</p>
                </div>
            )}
        </div>
    );
}
