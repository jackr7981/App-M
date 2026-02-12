import React, { useState, useEffect } from 'react';
import { UserProfile, Institution, Rank } from '../types';
import { supabase } from '../services/supabase';
import { Users, GraduationCap, School, Anchor, Search, Loader2 } from 'lucide-react';

export const AlumniAssociation: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Institution>(Institution.BMA);
    const [alumni, setAlumni] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchAlumni = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('institution', activeTab)
                //.order('batch', { ascending: false }) // Batch not yet implemented
                .limit(50); // Pagination later

            if (data) {
                setAlumni(data as UserProfile[]);
            }
            setIsLoading(false);
        };

        fetchAlumni();
    }, [activeTab]);

    const filteredAlumni = alumni.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.rank?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: Institution.BMA, label: 'BMA', icon: Anchor, fullName: 'Bangladesh Marine Academy' },
        { id: Institution.BMFA, label: 'BMFA', icon: School, fullName: 'Marine Fisheries Academy' },
        { id: Institution.NMI, label: 'NMI', icon: Anchor, fullName: 'National Maritime Institute' },
        { id: Institution.DIRECT, label: 'Direct Entry', icon: Users, fullName: 'Direct Entry Officers' },
        { id: Institution.PRIVATE, label: 'Private', icon: GraduationCap, fullName: 'Private Academies' },
    ];

    return (
        <div className="flex-1 overflow-auto bg-slate-50 relative h-full">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Alumni Association</h1>
                    <p className="text-slate-500 mt-1">Connect with batchmates and colleagues from your institution.</p>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-3 rounded-xl border transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4 mr-2" />
                            <span className="font-bold text-sm">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Header (Icon + Full Name + Search) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Users, { className: "w-6 h-6" })}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{tabs.find(t => t.id === activeTab)?.fullName}</h2>
                            <p className="text-sm text-slate-500">{filteredAlumni.length} Members Found</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search alumni..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                ) : filteredAlumni.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No alumni found for {tabs.find(t => t.id === activeTab)?.label}.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAlumni.map((user, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="w-14 h-14 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                                    {user.profilePicture ? (
                                        <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                                            {(user.firstName || '?').charAt(0)}{(user.lastName || '').charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{user.firstName} {user.lastName}</h3>
                                    <p className="text-xs font-semibold text-emerald-600 uppercase">{user.rank || 'Mariner'}</p>
                                    {user.batch && <p className="text-xs text-slate-500">Batch: {user.batch}</p>}
                                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                                        {user.isOnboard ? <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span> : <span className="w-2 h-2 bg-slate-300 rounded-full mr-1.5"></span>}
                                        {user.isOnboard ? 'Onboard' : 'On Leave'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
