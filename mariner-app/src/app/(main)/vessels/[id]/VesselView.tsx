"use client";

import { ArrowLeft, Ship, MapPin, Anchor, Wind, Navigation, Calendar, Globe, Ruler, ArrowLeftRight, ArrowDownToLine } from "lucide-react";
import Link from "next/link";

interface Vessel {
    id: string;
    name: string;
    imo: string;
    type: string;
    flag: string;
    built: number;
    dwt: string;
    length: string;
    breadth: string;
    draft: string;
    status: string;
    latitude: string;
    longitude: string;
    course: string;
    speed: string;
    destination: string;
    eta: string;
}

const vesselData: Record<string, Vessel> = {
    "9876543": {
        id: "9876543",
        name: "MV TITANIC II",
        imo: "9876543",
        type: "Passenger Ship",
        flag: "Bahamas",
        built: 2022,
        dwt: "56,000 t",
        length: "269 m",
        breadth: "32 m",
        draft: "10.5 m",
        status: "In Transit",
        latitude: "41.73 N",
        longitude: "49.95 W",
        course: "285°",
        speed: "18.5 kn",
        destination: "New York, USA",
        eta: "2026-04-15 08:00",
    },
    "1234567": {
        id: "1234567",
        name: "MSG EVER GIVEN",
        imo: "1234567",
        type: "Container Ship",
        flag: "Panama",
        built: 2018,
        dwt: "220,000 t",
        length: "399.9 m",
        breadth: "58.8 m",
        draft: "16.2 m",
        status: "Anchored",
        latitude: "31.05 N",
        longitude: "32.45 E",
        course: "0°",
        speed: "0.2 kn",
        destination: "Suez Canal, Egypt",
        eta: "2026-02-10 14:30",
    },
    "5558888": {
        id: "5558888",
        name: "LNG SPIRIT",
        imo: "5558888",
        type: "LNG Tanker",
        flag: "Marshall Islands",
        built: 2020,
        dwt: "95,000 t",
        length: "295 m",
        breadth: "46 m",
        draft: "12.0 m",
        status: "Moored",
        latitude: "25.28 N",
        longitude: "51.53 E",
        course: "120°",
        speed: "0 kn",
        destination: "Qatar, Doha",
        eta: "2026-02-05 09:00",
    },
    "9990001": {
        id: "9990001",
        name: "PACIFIC VOYAGER",
        imo: "9990001",
        type: "Bulk Carrier",
        flag: "Liberia",
        built: 2015,
        dwt: "82,000 t",
        length: "229 m",
        breadth: "32.2 m",
        draft: "14.5 m",
        status: "In Transit",
        latitude: "35.68 N",
        longitude: "139.76 E",
        course: "090°",
        speed: "14.2 kn",
        destination: "Shanghai, China",
        eta: "2026-03-22 18:00",
    },
};

export function VesselView({ id }: { id: string }) {
    const vessel = vesselData[id];

    if (!vessel) {
        return (
            <div className="flex h-64 items-center justify-center text-slate-500">
                Vessel not found.
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl pb-10">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <Link
                    href="/vessels"
                    className="rounded-full bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {vessel.name}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        IMO: {vessel.imo} • {vessel.flag}
                    </p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Particulars Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        <Ship className="h-4 w-4" /> Particulars
                    </h2>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-slate-50 pb-2 dark:border-slate-800">
                            <span className="text-sm text-slate-500">Vessel Type</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{vessel.type}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2 dark:border-slate-800">
                            <span className="text-sm text-slate-500">Built</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{vessel.built}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2 dark:border-slate-800">
                            <span className="text-sm text-slate-500">DWT</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{vessel.dwt}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Flag</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{vessel.flag}</span>
                        </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
                        <div className="mb-4 flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-slate-400" />
                            <h3 className="text-xs font-bold uppercase text-slate-500">Dimensions</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center rounded-xl bg-slate-50 p-2.5 text-center transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
                                <span className="mb-1 text-[10px] font-medium uppercase text-slate-400">Length</span>
                                <div className="flex items-end gap-0.5">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{vessel.length}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center rounded-xl bg-slate-50 p-2.5 text-center transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
                                <span className="mb-1 text-[10px] font-medium uppercase text-slate-400">Breadth</span>
                                <div className="flex items-end gap-0.5">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{vessel.breadth}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center rounded-xl bg-slate-50 p-2.5 text-center transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
                                <span className="mb-1 text-[10px] font-medium uppercase text-slate-400">Draft</span>
                                <div className="flex items-end gap-0.5">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{vessel.draft}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Map / Voyage Info */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Map Simulation */}
                    <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/0,0,1,0,0,600x400?access_token=none')] bg-cover opacity-50 grayscale dark:opacity-20"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <Globe className="mb-2 h-10 w-10 text-sky-500/50" />
                            <p className="text-sm font-medium text-slate-500">Interactive Map Simulation</p>
                            <div className="mt-4 flex items-center gap-4 rounded-xl bg-white/80 p-3 backdrop-blur-md dark:bg-slate-900/80">
                                <div className="text-left">
                                    <p className="text-[10px] uppercase text-slate-400">Lat</p>
                                    <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{vessel.latitude}</p>
                                </div>
                                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                                <div className="text-left">
                                    <p className="text-[10px] uppercase text-slate-400">Lon</p>
                                    <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{vessel.longitude}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Voyage Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-sky-500">
                                <Navigation className="h-3.5 w-3.5" /> Destination
                            </div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white">{vessel.destination}</div>
                            <div className="mt-1 text-xs text-slate-400">ETA: {vessel.eta}</div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-500">
                                <Wind className="h-3.5 w-3.5" /> Speed & Course
                            </div>
                            <div className="flex items-end gap-2">
                                <div className="text-lg font-bold text-slate-900 dark:text-white">{vessel.speed}</div>
                                <div className="mb-1 text-sm text-slate-500">/ {vessel.course}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
