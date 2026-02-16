import React, { useState } from 'react';
import { Search, Navigation, Compass, Wind, MapPin, Clock, Anchor, Target } from 'lucide-react';
import { supabase } from '../services/supabase';
import { VesselData } from '../types';

export const VesselTracker: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [vesselData, setVesselData] = useState<VesselData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            setError('Please enter a vessel name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setError('Please log in to track vessels');
                setLoading(false);
                return;
            }

            // Using Supabase Edge Function as per back-end spec
            const { data, error: functionError } = await supabase.functions.invoke('vessel-tracker', {
                body: {
                    vesselName: searchQuery.toUpperCase(),
                    userId: user.id,
                },
            });

            if (functionError) {
                setError(functionError.message || 'Failed to fetch vessel data');
                setLoading(false);
                return;
            }

            if (data?.error) {
                setError(data.error);
                setVesselData(null);
            } else {
                setVesselData(data);
            }
        } catch (err) {
            setError('An error occurred while searching for the vessel');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatUTCTime = () => {
        const now = new Date();
        return now.toUTCString().split(' ')[4]; // Returns HH:MM:SS
    };

    const getSpeedIndicator = (diff: number | undefined) => {
        if (diff === undefined) return null;
        return diff >= 0 ? '↗' : '↘';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Intro */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Vessel Tracker</h2>
                        <p className="text-sm text-slate-500">Real-time AIS tracking for vessels worldwide.</p>
                    </div>
                </div>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Enter vessel name (e.g. MAERSK GENOA)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        disabled={loading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !searchQuery.trim()}
                    className="bg-blue-600 text-white px-6 rounded-2xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Tracking...</span>
                        </div>
                    ) : (
                        'Track'
                    )}
                </button>
            </form>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium animate-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            {/* Vessel Data Display */}
            {vesselData ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Main Identity Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                            <Anchor className="w-48 h-48" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">{vesselData.vessel_name}</h3>
                                    <p className="text-blue-300 text-xs font-mono mt-1">
                                        IMO: {vesselData.imo_number || 'UNKNOWN'} • TYPE: {vesselData.vessel_type || 'CARGO'}
                                    </p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold border border-white/10">
                                    {vesselData.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Destination</p>
                                    <p className="text-sm font-bold truncate">{vesselData.destination || 'NOT REPORTED'}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">UTC Time</p>
                                    <p className="text-sm font-bold font-mono tracking-tighter">{formatUTCTime()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* SOG */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                                    <Navigation className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-500">SOG (Knots)</span>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-800">
                                    {vesselData.speed_over_ground?.toFixed(1) || '0.0'}
                                </div>
                                {vesselData.speedDifference !== undefined && (
                                    <p className={`text-[10px] font-bold mt-1 ${vesselData.speedDifference >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {getSpeedIndicator(vesselData.speedDifference)} {Math.abs(vesselData.speedDifference).toFixed(1)} vs Avg
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Heading */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
                                    <Compass className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-500">Heading</span>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-slate-800">
                                    {vesselData.heading?.toFixed(0)}°
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">True Course</p>
                            </div>
                        </div>

                        {/* Position */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="bg-rose-50 p-1.5 rounded-lg text-rose-600">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-500">Coordinates</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-700">LAT: {vesselData.latitude?.toFixed(4)}°</p>
                                    <p className="text-sm font-bold text-slate-700">LON: {vesselData.longitude?.toFixed(4)}°</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        <span>LAST UPDATED</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-800 mt-0.5">
                                        {new Date(vesselData.last_updated).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Weather - Only if available */}
                        {vesselData.wind_speed && (
                            <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-100 col-span-2 text-white flex justify-between items-center relative overflow-hidden">
                                <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                                    <Wind className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Wind className="w-4 h-4 text-blue-200" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Weather Report</span>
                                    </div>
                                    <h4 className="text-lg font-bold">{vesselData.sea_state} Seas</h4>
                                </div>
                                <div className="relative z-10 text-right">
                                    <p className="text-4xl font-black">{vesselData.wind_speed}<span className="text-sm ml-1">KTS</span></p>
                                    <p className="text-[10px] font-bold text-blue-200">WIND SPEED</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : !loading && !error && (
                <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-40">
                    <Navigation className="w-16 h-16 text-slate-300 mb-4 animate-pulse" />
                    <p className="text-slate-500 font-medium">Search for a vessel to see real-time positional data and weather conditions.</p>
                </div>
            )}
        </div>
    );
};
