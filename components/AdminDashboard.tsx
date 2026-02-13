import React, { useState, useEffect, useMemo } from 'react';
import { User, UserProfile, ShipType, Rank, DocumentCategory, MarinerDocument, Department, JobPosting, Institution } from '../types';
import { LogOut, Users, FileCheck, Anchor, Search, ChevronRight, ArrowLeft, BarChart, Shield, HardDrive, Database, FileText, Clock, Briefcase, PlusCircle, CheckCircle, XCircle, Sparkles, Loader2, School } from 'lucide-react';
import { parseJobPosting } from '../services/geminiService';
import { Documents } from './Documents';
import { supabase, isMockMode } from '../services/supabase';

interface AdminDashboardProps {
    onLogout: () => void;
}

interface UserStorageInfo {
    userId: string;
    userName: string;
    rank: string;
    docCount: number;
    totalSizeBytes: number;
    usageMinutes: number;
}

// Generate Mock Data for Admin View
const generateMockUsers = (count: number): User[] => {
    const users: User[] = [];
    const names = ['Rahim', 'Karim', 'Sultan', 'Akbar', 'Jalal', 'Mizan', 'Kamal', 'Hassan', 'Farid', 'Nazrul'];
    const lastNames = ['Uddin', 'Ahmed', 'Khan', 'Chowdhury', 'Ali', 'Islam', 'Rahman', 'Sarkar', 'Mia', 'Bhuiyan'];

    for (let i = 0; i < count; i++) {
        const firstName = names[Math.floor(Math.random() * names.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const rank = Object.values(Rank)[Math.floor(Math.random() * Object.values(Rank).length)];
        const shipType = Object.values(ShipType)[Math.floor(Math.random() * Object.values(ShipType).length)];

        users.push({
            id: `user-${i}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            isVerified: true,
            profile: {
                firstName,
                lastName,
                rank: rank as Rank,
                department: Department.DECK, // Simplified
                cdcNumber: `C/O/${Math.floor(10000 + Math.random() * 90000)}`,
                mobileNumber: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
                dateOfBirth: '1990-01-01',
                preferredShipType: shipType as ShipType,
                profilePicture: null,
                seaServiceHistory: []
            }
        });
    }
    return users;
};

// Generate Mock Documents for a User
const generateMockDocuments = (userId: string): MarinerDocument[] => {
    const docs: MarinerDocument[] = [];
    const titles = ['CDC', 'COC', 'Passport', 'Medical', 'STCW Basic Safety', 'Seaman Book'];

    titles.forEach((title, idx) => {
        // Randomize expiry to simulate valid/invalid pool
        const isExpiringSoon = Math.random() > 0.7;
        const year = isExpiringSoon ? 2023 : 2026 + Math.floor(Math.random() * 3);
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;

        docs.push({
            id: `${userId}-doc-${idx}`,
            title,
            category: DocumentCategory.CERTIFICATE,
            documentNumber: `DOC-${Math.floor(Math.random() * 1000)}`,
            expiryDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            fileUrl: '',
            uploadDate: Date.now()
        });
    });
    return docs;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'storage' | 'jobs'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userDocuments, setUserDocuments] = useState<MarinerDocument[]>([]);
    const [storageStats, setStorageStats] = useState<UserStorageInfo[]>([]);
    const [totalDocs, setTotalDocs] = useState(0);
    const [isLoadingStorage, setIsLoadingStorage] = useState(false);

    // Jobs State
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [isParsing, setIsParsing] = useState(false);

    useEffect(() => {
        // Fetch Users logic
        const loadUsers = async () => {
            if (isMockMode) {
                setUsers(generateMockUsers(25));
            } else {
                // Real Supabase Fetch - Requires RLS policy allowing admin to see all profiles
                const { data, error } = await supabase.from('profiles').select('*');
                if (data && !error) {
                    // Map raw DB profile to User object structure
                    const mappedUsers = data.map((p: any) => ({
                        id: p.id,
                        email: 'user@example.com', // Email strictly not exposed in profiles table usually, but okay for list
                        isVerified: true,
                        profile: {
                            firstName: p.first_name,
                            lastName: p.last_name,
                            rank: p.rank,
                            department: p.department,
                            cdcNumber: p.cdc_number,
                            mobileNumber: p.mobile_number,
                            dateOfBirth: p.date_of_birth,
                            preferredShipType: p.preferred_ship_type,
                            profilePicture: null
                        }
                    }));
                    setUsers(mappedUsers);
                }
            }
        };
        loadUsers();
    }, []);

    // Load storage stats
    useEffect(() => {
        const loadStorageStats = async () => {
            setIsLoadingStorage(true);
            try {
                if (isMockMode) {
                    // Mock storage data
                    const mockStorage: UserStorageInfo[] = users.slice(0, 10).map((u, i) => ({
                        userId: u.id || `user-${i}`,
                        userName: `${u.profile?.firstName} ${u.profile?.lastName}`,
                        rank: u.profile?.rank || 'Unknown',
                        docCount: Math.floor(Math.random() * 12) + 1,
                        totalSizeBytes: Math.floor(Math.random() * 15 * 1024 * 1024)
                    }));
                    setStorageStats(mockStorage);
                    setTotalDocs(mockStorage.reduce((s, u) => s + u.docCount, 0));
                } else {
                    // Real query: documents grouped by user
                    const { data: docs } = await supabase.from('documents').select('user_id, file_path, title, category');
                    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, rank, total_usage_minutes');
                    if (docs && profiles) {
                        setTotalDocs(docs.length);
                        const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
                        const userMap = new Map<string, { count: number; size: number }>();
                        docs.forEach((d: any) => {
                            const prev = userMap.get(d.user_id) || { count: 0, size: 0 };
                            // Estimate ~200KB per doc if file_path exists
                            prev.count += 1;
                            prev.size += 200 * 1024;
                            userMap.set(d.user_id, prev);
                        });
                        const stats: UserStorageInfo[] = [];
                        profiles.forEach((p: any) => { // Iterate over profiles to include usage even if no docs
                            const val = userMap.get(p.id) || { count: 0, size: 0 };
                            stats.push({
                                userId: p.id,
                                userName: `${p.first_name || ''} ${p.last_name || ''}`,
                                rank: p.rank || 'N/A',
                                docCount: val.count,
                                totalSizeBytes: val.size,
                                usageMinutes: p.total_usage_minutes || 0
                            });
                        });
                        stats.sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
                        setStorageStats(stats);
                    }
                }
            } catch (err) {
                console.error('Storage stats error:', err);
            } finally {
                setIsLoadingStorage(false);
            }
        };
        if (users.length > 0) loadStorageStats();
    }, [users]);

    // Load Jobs
    const fetchJobs = async () => {
        if (activeTab !== 'jobs') return;
        setJobsLoading(true);
        const { data, error } = await supabase
            .from('job_postings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching jobs:", error);
        console.log("Jobs data:", data);

        if (data) {
            const mappedJobs: JobPosting[] = data.map((item: any) => {
                const parsed = item.parsed_content || {};

                return {
                    id: item.id,
                    // Use individual columns first (faster), fallback to parsed_content
                    rank: item.rank || parsed.rank || 'Unknown',
                    shipType: parsed.shipType || 'Unknown',
                    wage: item.salary || parsed.salary || parsed.wage || 'Negotiable',
                    joiningDate: item.joining_date || parsed.joining_date || parsed.joiningDate || 'ASAP',
                    description: parsed.description || item.raw_content,
                    contactInfo: parsed.contact || parsed.contactInfo || 'N/A',
                    source: item.source,
                    postedDate: new Date(item.created_at).getTime(),
                    companyName: item.agency || parsed.agency || parsed.companyName || parsed.company || 'Unknown',
                    // New SHIPPED format fields
                    mlaNumber: item.mla_number || parsed.mla_number || 'N/A',
                    agencyAddress: item.agency_address || parsed.address || 'N/A',
                    mobile: item.mobile_number || parsed.mobile || 'N/A',
                    email: item.agency_email || parsed.email || 'N/A',
                    // Admin-specific tracking fields
                    status: item.status,
                    sourceGroupName: item.source_group_name,
                    parsingAttempts: item.parsing_attempts || 0,
                    lastParsingError: item.last_parsing_error
                } as JobPosting & {
                    status: string;
                    sourceGroupName?: string;
                    parsingAttempts?: number;
                    lastParsingError?: string;
                };
            });
            setJobs(mappedJobs);
        }
        setJobsLoading(false);
    };

    useEffect(() => {
        fetchJobs();
    }, [activeTab]);

    const handleJobStatusChange = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('job_postings').update({ status: newStatus }).eq('id', id);
        if (!error) {
            setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: newStatus } : j) as JobPosting));
        }
    };

    const handleSmartImport = async () => {
        if (!importText.trim()) return;
        setIsParsing(true);
        try {
            const parsed = await parseJobPosting(importText);
            const { error } = await supabase.from('job_postings').insert({
                source: 'manual',
                raw_content: importText,
                parsed_content: parsed,
                status: 'approved'
            });
            if (error) throw error;
            setShowImport(false);
            setImportText('');
            fetchJobs();
        } catch (e) {
            console.error(e);
            alert('Failed to import job: ' + (e as Error).message);
        } finally {
            setIsParsing(false);
        }
    };

    const handleUserClick = async (user: User) => {
        setSelectedUser(user);
        // Fetch documents for this user
        if (isMockMode) {
            setUserDocuments(generateMockDocuments(user.id || 'temp'));
        } else {
            // Fetch from Supabase
            const { data } = await supabase.from('documents').select('*').eq('user_id', user.id);
            if (data) {
                const mappedDocs = data.map((doc: any) => ({
                    id: doc.id,
                    title: doc.title,
                    expiryDate: doc.expiry_date || 'N/A',
                    documentNumber: doc.document_number,
                    fileUrl: '', // URLs fetched on demand or use getStorageUrl here
                    uploadDate: new Date(doc.created_at).getTime(),
                    category: doc.category
                }));
                setUserDocuments(mappedDocs);
            }
        }
    };

    const filteredUsers = useMemo(() => {
        const lowerQ = searchQuery.toLowerCase();
        return users.filter(u =>
            (u.profile?.firstName || '').toLowerCase().includes(lowerQ) ||
            (u.profile?.lastName || '').toLowerCase().includes(lowerQ) ||
            (u.profile?.cdcNumber || '').toLowerCase().includes(lowerQ)
        );
    }, [users, searchQuery]);

    // Analytics
    const shipTypeStats = useMemo(() => {
        const stats: Record<string, number> = {};
        users.forEach(u => {
            const type = u.profile?.preferredShipType || 'Unspecified';
            stats[type] = (stats[type] || 0) + 1;
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    }, [users]);

    const validCertCount = useMemo(() => {
        return Math.floor(users.length * 0.7);
    }, [users]);

    const totalStorageBytes = useMemo(() => {
        return storageStats.reduce((s, u) => s + u.totalSizeBytes, 0);
    }, [storageStats]);

    const totalUsageHours = useMemo(() => {
        const minutes = storageStats.reduce((s, u) => s + (u.usageMinutes || 0), 0);
        return (minutes / 60).toFixed(1);
    }, [storageStats]);

    const formatBytes = (bytes: number) => {
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
        return bytes + ' B';
    };

    const handleInstitutionChange = async (userId: string, institution: string) => {
        const { error } = await supabase.from('profiles').update({ institution }).eq('id', userId);
        if (!error) {
            // Update local state
            if (selectedUser && selectedUser.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, profile: { ...prev.profile!, institution } } : null);
            }
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, profile: { ...u.profile!, institution } } : u));
        } else {
            console.error('Failed to update institution:', error);
            alert('Failed to update institution');
        }
    };

    // If drill-down view is active
    if (selectedUser) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col">
                <header className="bg-slate-800 text-white p-4 shadow-lg sticky top-0 z-50">
                    <div className="container mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                            <div>
                                <h1 className="font-bold text-lg">{selectedUser.profile?.firstName} {selectedUser.profile?.lastName}</h1>
                                <p className="text-xs text-slate-400">{selectedUser.profile?.rank} • {selectedUser.profile?.cdcNumber}</p>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 container mx-auto p-4">
                    {/* Institution Selector */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center">
                            <School className="w-5 h-5 mr-2 text-emerald-600" /> Institution / Alumni Association
                        </h2>
                        <div className="flex gap-4 items-center">
                            <select
                                value={selectedUser.profile?.institution || ''}
                                onChange={(e) => handleInstitutionChange(selectedUser.id, e.target.value)}
                                className="p-3 border border-slate-300 rounded-xl text-sm w-full max-w-md focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">Select Institution...</option>
                                {Object.values(Institution).map(inst => (
                                    <option key={inst} value={inst}>{inst}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Documents
                        documents={userDocuments}
                        onAddDocument={() => { }}
                        onDeleteDocument={() => { }}
                        onUpdateDocument={() => { }}
                        readOnly={true} // Admin Read Only
                    />
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overscroll-none">
            {/* Header */}
            <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-emerald-400" />
                        <span className="font-bold text-lg">Admin Console</span>
                    </div>
                    <button onClick={onLogout} className="text-slate-300 hover:text-white flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
                <div className="container mx-auto flex">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart className="w-4 h-4 inline-block mr-2" /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'users' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users className="w-4 h-4 inline-block mr-2" /> Mariners
                    </button>
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'jobs' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Briefcase className="w-4 h-4 inline-block mr-2" /> Job Board
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'storage' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <HardDrive className="w-4 h-4 inline-block mr-2" /> Usage & Storage
                    </button>
                </div>
            </div>

            <main className="flex-1 container mx-auto p-6">

                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-slate-500 font-medium text-xs">Total Mariners</h3>
                                    <Users className="w-4 h-4 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-slate-500 font-medium text-xs">Total User Time</h3>
                                    <Clock className="w-4 h-4 text-pink-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{totalUsageHours} hrs</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-slate-500 font-medium text-xs">Ready for Sea</h3>
                                    <Anchor className="w-4 h-4 text-emerald-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{validCertCount}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-slate-500 font-medium text-xs">Total Documents</h3>
                                    <FileText className="w-4 h-4 text-violet-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{totalDocs}</p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-6">Preferred Ship Type Distribution</h3>
                            <div className="space-y-4">
                                {shipTypeStats.map(([type, count]) => (
                                    <div key={type}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700">{type}</span>
                                            <span className="text-slate-500">{count} Users</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${(count / users.length) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Storage Users */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4">Top Storage Users</h3>
                            <div className="space-y-3">
                                {storageStats.slice(0, 5).map((u) => (
                                    <div key={u.userId} className="flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold text-sm text-slate-700">{u.userName}</span>
                                            <span className="text-xs text-slate-400 ml-2">{u.rank}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-slate-700">{formatBytes(u.totalSizeBytes)}</span>
                                            <span className="text-xs text-slate-400 ml-2">{u.docCount} docs</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Search */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by Name, CDC Number..."
                                className="flex-1 outline-none text-slate-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4 hidden md:table-cell">Rank</th>
                                        <th className="p-4 hidden md:table-cell">Ship Type</th>
                                        <th className="p-4">CDC No</th>
                                        <th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{user.profile?.firstName} {user.profile?.lastName}</div>
                                                <div className="text-xs text-slate-400 md:hidden">{user.profile?.rank}</div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell text-sm text-slate-600">{user.profile?.rank}</td>
                                            <td className="p-4 hidden md:table-cell text-sm text-slate-600">{user.profile?.preferredShipType || '-'}</td>
                                            <td className="p-4 font-mono text-xs text-slate-500">{user.profile?.cdcNumber}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleUserClick(user)}
                                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center text-xs font-bold"
                                                >
                                                    View Docs <ChevronRight className="w-3 h-3 ml-1" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    No users found matching "{searchQuery}"
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'storage' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Storage Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-slate-500 font-medium text-xs mb-2">Total Storage Used</h3>
                                <p className="text-2xl font-bold text-slate-800">{formatBytes(totalStorageBytes)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-slate-500 font-medium text-xs mb-2">Total Documents</h3>
                                <p className="text-2xl font-bold text-slate-800">{totalDocs}</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-slate-500 font-medium text-xs mb-2">Users with Docs</h3>
                                <p className="text-2xl font-bold text-slate-800">{storageStats.length}</p>
                            </div>
                        </div>

                        {/* Per-User Storage Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-emerald-500" /> Per-User Storage Breakdown
                                </h3>
                            </div>
                            {isLoadingStorage ? (
                                <div className="p-8 text-center text-slate-400">Loading storage data...</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                        <tr>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Rank</th>
                                            <th className="p-4 text-right">Time Spent</th>
                                            <th className="p-4 text-right">Documents</th>
                                            <th className="p-4 text-right">Storage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {storageStats.map((u) => (
                                            <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <span className="font-bold text-slate-800">{u.userName}</span>
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">{u.rank}</td>
                                                <td className="p-4 text-right">
                                                    <span className="font-bold text-sm text-blue-600">
                                                        {u.usageMinutes < 60 ? `${u.usageMinutes || 0}m` : `${((u.usageMinutes || 0) / 60).toFixed(1)}h`}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-mono text-sm text-slate-700">{u.docCount}</td>
                                                <td className="p-4 text-right">
                                                    <span className="font-bold text-sm text-slate-800">{formatBytes(u.totalSizeBytes)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {storageStats.length === 0 && !isLoadingStorage && (
                                <div className="p-8 text-center text-slate-400">No storage data available</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'jobs' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                                <Briefcase className="w-5 h-5 mr-2 text-emerald-600" /> Job Postings
                            </h2>
                            <button
                                onClick={() => setShowImport(true)}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-emerald-700 transition-colors"
                            >
                                <PlusCircle className="w-4 h-4 mr-2" /> Import Job
                            </button>
                        </div>

                        {/* Job List */}
                        <div className="space-y-4">
                            {jobsLoading ? (
                                <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" /></div>
                            ) : jobs.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">No jobs found. Import one!</div>
                            ) : (
                                jobs.map(job => (
                                    <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${(job as any).status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                        (job as any).status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>{(job as any).status}</span>
                                                    <span className="text-xs text-slate-400">• {job.source}</span>
                                                </div>
                                                <h3 className="font-bold text-lg">{job.rank}</h3>
                                                <p className="text-sm text-slate-600">{job.shipType} • {job.wage}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {(job as any).status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleJobStatusChange(job.id, 'approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Approve"><CheckCircle className="w-5 h-5" /></button>
                                                        <button onClick={() => handleJobStatusChange(job.id, 'rejected')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Reject"><XCircle className="w-5 h-5" /></button>
                                                    </>
                                                )}
                                                {(job as any).status !== 'pending' && (
                                                    <button onClick={() => handleJobStatusChange(job.id, 'pending')} className="text-xs text-slate-400 underline">Reset</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                            {job.description}
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                            {job.mlaNumber && job.mlaNumber !== 'N/A' && (
                                                <div className="bg-amber-50 p-2 rounded border border-amber-200">
                                                    <span className="text-amber-600 font-bold block">MLA Number</span>
                                                    <span className="text-amber-900">{job.mlaNumber}</span>
                                                </div>
                                            )}
                                            {job.agencyAddress && job.agencyAddress !== 'N/A' && (
                                                <div className="bg-purple-50 p-2 rounded border border-purple-200 col-span-2">
                                                    <span className="text-purple-600 font-bold block">Address</span>
                                                    <span className="text-purple-900">{job.agencyAddress}</span>
                                                </div>
                                            )}
                                            {job.mobile && job.mobile !== 'N/A' && (
                                                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                                    <span className="text-blue-600 font-bold block">Mobile</span>
                                                    <span className="text-blue-900 font-mono">{job.mobile}</span>
                                                </div>
                                            )}
                                            {job.email && job.email !== 'N/A' && (
                                                <div className="bg-green-50 p-2 rounded border border-green-200">
                                                    <span className="text-green-600 font-bold block">Email</span>
                                                    <span className="text-green-900 font-mono truncate block">{job.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Import Modal */}
                        {showImport && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowImport(false)}></div>
                                <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                                    <h3 className="text-xl font-bold mb-4 flex items-center"><Sparkles className="w-5 h-5 text-emerald-500 mr-2" /> Import Job</h3>
                                    <textarea
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder="Paste job text here..."
                                        className="w-full h-40 p-4 border rounded-xl bg-slate-50 outline-none text-sm resize-none mb-4"
                                        disabled={isParsing}
                                    ></textarea>
                                    <button
                                        onClick={handleSmartImport}
                                        disabled={isParsing || !importText.trim()}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-70"
                                    >
                                        {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Parse & Save'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};