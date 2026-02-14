import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage, MarinerDocument, DocumentCategory, SeaServiceRecord } from '../types';
import { User as UserIcon, LogOut, Send, Bot, Ship, FileText, Anchor, Edit, Building2, Briefcase, Stethoscope, Palmtree, Users, HeartHandshake, Home, Grid, ChevronRight, X, Settings, LogOut as LogOutIcon, School } from 'lucide-react';
import { getGeminiResponse } from '../services/geminiService';
import { Documents } from './Documents';
import { SeaService } from './SeaService';
import { ManningAgents } from './ManningAgents';
import { JobBoard } from './JobBoard';
import { AlumniAssociation } from './AlumniAssociation';
import { MedicalCenters } from './MedicalCenters';
import { Community } from './Community';
import { Wellbeing } from './Wellbeing';
import { supabase, getStorageUrl, isMockMode } from '../services/supabase';

interface DashboardProps {
    user: User;
    onLogout: () => void;
    onEditProfile: () => void;
    onUpdateSeaService: (records: SeaServiceRecord[]) => void;
    onToggleJobStatus: (status: boolean) => void;
    onToggleOnboardStatus: (status: boolean) => void;
}

// Grouping Navigation Items
type TabId = 'home' | 'jobs' | 'chat' | 'documents' | 'menu' | 'seaservice' | 'agents' | 'medical' | 'community' | 'wellbeing' | 'alumni';

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onEditProfile, onUpdateSeaService, onToggleJobStatus, onToggleOnboardStatus }) => {
    const [activeTab, setActiveTab] = useState<TabId>('home');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [highlightedMLA, setHighlightedMLA] = useState<string | null>(null);

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'model',
            text: `Welcome aboard, ${user.profile?.rank} ${user.profile?.lastName}! I am Sea Mate, your personal AI assistant.`,
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Status Confirmations
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [showOnboardConfirm, setShowOnboardConfirm] = useState(false);

    // Document management
    const [documents, setDocuments] = useState<MarinerDocument[]>([]);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [user]);

    const fetchDocuments = async () => {
        if (isMockMode) {
            setDocuments([
                { id: '1', title: 'Continuous Discharge Certificate', expiryDate: '2028-05-12', documentNumber: 'C/O/88219', fileUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=600', uploadDate: Date.now(), category: DocumentCategory.PERSONAL_ID },
                { id: '2', title: 'Certificate of Competency', expiryDate: '2025-11-01', documentNumber: 'COC-DK-221', fileUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=600', uploadDate: Date.now() - 1000, category: DocumentCategory.LICENSE },
            ]);
            return;
        }
        // ... (Existing Supabase logic omitted for brevity, keeping existing flow) ...
        // Assuming identical logic to previous version for fetch
        if (user.profile && user.email) {
            const cachedDocs = localStorage.getItem(`bd_mariner_docs_${user.email}`);
            if (cachedDocs) try { setDocuments(JSON.parse(cachedDocs)); } catch (e) { }
        }
        if (!navigator.onLine) return;
        try {
            const { data } = await supabase.from('documents').select('*').order('expiry_date', { ascending: true });
            if (data) {
                const mappedDocs: MarinerDocument[] = data.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    expiryDate: doc.expiry_date || 'N/A',
                    documentNumber: doc.document_number,
                    fileUrl: getStorageUrl('documents', doc.file_path),
                    pages: doc.page_paths ? doc.page_paths.map((p: string) => getStorageUrl('documents', p)) : undefined,
                    uploadDate: new Date(doc.created_at).getTime(),
                    category: doc.category as DocumentCategory
                }));
                setDocuments(mappedDocs);
                if (user.email) localStorage.setItem(`bd_mariner_docs_${user.email}`, JSON.stringify(mappedDocs));
            }
        } catch (error) { console.error('Error fetching documents:', error); }
    };

    // Chat Logic
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { if (activeTab === 'chat') scrollToBottom(); }, [messages, activeTab]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        if (isOffline) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I am offline.", timestamp: Date.now() }]);
            return;
        }
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const responseText = await getGeminiResponse(userMsg.text, history);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() }]);
        setIsLoading(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

    // Document Handlers
    const handleAddDocument = (doc: MarinerDocument) => isMockMode ? setDocuments(prev => [...prev, doc]) : fetchDocuments();
    const handleUpdateDocument = (updatedDoc: MarinerDocument) => isMockMode ? setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d)) : fetchDocuments();
    const handleDeleteDocument = (id: string) => setDocuments(prev => prev.filter(d => d.id !== id));

    // Determine if we are on a secondary tab
    const isSecondaryTab = ['seaservice', 'agents', 'medical', 'community', 'wellbeing'].includes(activeTab);

    // App Grid Items
    const menuItems = [
        { id: 'seaservice', label: 'Sea Service', icon: Ship, color: 'bg-blue-100 text-blue-600' },
        { id: 'agents', label: 'Agents', icon: Building2, color: 'bg-indigo-100 text-indigo-600' },
        { id: 'medical', label: 'Medical', icon: Stethoscope, color: 'bg-rose-100 text-rose-600' },
        { id: 'community', label: 'Forum', icon: Users, color: 'bg-purple-100 text-purple-600' },
        { id: 'wellbeing', label: 'Wellbeing', icon: HeartHandshake, color: 'bg-emerald-100 text-emerald-600' },
        { id: 'alumni', label: 'Alumni', icon: School, color: 'bg-amber-100 text-amber-600' },
    ];

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative selection:bg-blue-100">

            {/* 1. TOP HEADER - Minimal & Sticky */}
            <header className="px-5 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/50 flex justify-between items-center transition-all">
                <div className="flex items-center gap-2.5" onClick={() => setActiveTab('home')}>
                    <div className="bg-gradient-to-tr from-blue-600 to-blue-500 p-1.5 rounded-lg shadow-sm cursor-pointer">
                        <Anchor className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="font-bold text-lg tracking-tight text-slate-800 cursor-pointer">MarinerHub</h1>
                </div>

                {/* Profile Avatar Trigger */}
                <button
                    onClick={() => setIsProfileOpen(true)}
                    className="relative w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-white/50 shadow-sm transition-transform active:scale-95"
                >
                    {user.profile?.profilePicture ? (
                        <img src={user.profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-full h-full p-1.5 text-slate-400" />
                    )}
                    {/* Status Indicator Dot */}
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOffline ? 'bg-slate-400' : 'bg-green-500'}`}></div>
                </button>
            </header>

            {/* 2. MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 scroll-smooth no-scrollbar">

                {/* HOME DASHBOARD */}
                {activeTab === 'home' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Greeting Card - REMOVED overflow-hidden from parent to allow popups to escape, added clipped container for background */}
                        <div className="relative bg-gradient-to-br from-blue-900 to-slate-800 rounded-2xl shadow-lg text-white">

                            {/* Background Decoration Container (Clipped) */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                                <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                                    <Anchor className="w-32 h-32" />
                                </div>
                            </div>

                            <div className="relative z-10 p-5">
                                <h2 className="text-xl font-bold">Hi, {user.profile?.rank} {user.profile?.lastName}</h2>
                                <p className="text-blue-200 text-sm mt-1 mb-4">You have {documents.length} docs & {user.profile?.seaServiceHistory?.length || 0} service records.</p>

                                {/* Compact Status Toggles */}
                                <div className="flex gap-2">
                                    {/* Job Status */}
                                    <div className="relative flex-1">
                                        <button
                                            onClick={() => setShowStatusConfirm(!showStatusConfirm)}
                                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold shadow-sm border border-white/10 flex items-center justify-center transition-all active:scale-95 ${user.profile?.isOpenForWork ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-200'
                                                }`}
                                        >
                                            {user.profile?.isOpenForWork ? 'Available' : 'Unavailable'}
                                        </button>
                                        {showStatusConfirm && (
                                            <div className="absolute top-full mt-2 left-0 w-40 bg-white text-slate-800 p-2 rounded-xl shadow-xl border border-slate-100 z-50 animate-in zoom-in-95 origin-top-left">
                                                <p className="text-[10px] mb-2 font-bold text-center">Set Job Status?</p>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { onToggleJobStatus(!user.profile?.isOpenForWork); setShowStatusConfirm(false); }} className="flex-1 bg-emerald-500 text-white text-[10px] py-1.5 rounded font-bold">Yes</button>
                                                    <button onClick={() => setShowStatusConfirm(false)} className="flex-1 bg-slate-100 text-slate-500 text-[10px] py-1.5 rounded font-bold">No</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Onboard Status */}
                                    <div className="relative flex-1">
                                        <button
                                            onClick={() => setShowOnboardConfirm(!showOnboardConfirm)}
                                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold shadow-sm border border-white/10 flex items-center justify-center transition-all active:scale-95 ${user.profile?.isOnboard ? 'bg-sky-500 text-white' : 'bg-amber-500 text-white'
                                                }`}
                                        >
                                            {user.profile?.isOnboard ? 'Onboard' : 'On Leave'}
                                        </button>
                                        {showOnboardConfirm && (
                                            <div className="absolute top-full mt-2 right-0 w-40 bg-white text-slate-800 p-2 rounded-xl shadow-xl border border-slate-100 z-50 animate-in zoom-in-95 origin-top-right">
                                                <p className="text-[10px] mb-2 font-bold text-center">Set Status?</p>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { onToggleOnboardStatus(!user.profile?.isOnboard); setShowOnboardConfirm(false); }} className="flex-1 bg-blue-600 text-white text-[10px] py-1.5 rounded font-bold">Yes</button>
                                                    <button onClick={() => setShowOnboardConfirm(false)} className="flex-1 bg-slate-100 text-slate-500 text-[10px] py-1.5 rounded font-bold">No</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Access Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setActiveTab('jobs')} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform text-left">
                                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                                    <Briefcase className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm">Find Jobs</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Browse Vacancies</p>
                            </button>
                            <button onClick={() => setActiveTab('chat')} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform text-left">
                                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mb-2">
                                    <Bot className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm">Ask AI</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Maritime Assistant</p>
                            </button>
                        </div>

                        {/* Community Teaser */}
                        <div onClick={() => setActiveTab('community')} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.99] transition-transform cursor-pointer">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-800 text-sm">Community Highlights</h3>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                            </div>
                            <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-blue-500">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-700 line-clamp-2">Latest discussion on Chittagong port entry delays.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">2h ago • Deck Dept</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MENU GRID (MORE APPS) */}
                {activeTab === 'menu' && (
                    <div className="animate-in slide-in-from-bottom-5 duration-300">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Apps & Tools</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as TabId)}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center text-center aspect-square gap-3"
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.color}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-sm text-slate-700">{item.label}</span>
                                </button>
                            ))}
                            {/* Edit Profile Shortcut in Grid */}
                            <button
                                onClick={() => { setIsProfileOpen(false); onEditProfile(); }}
                                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center text-center aspect-square gap-3"
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm text-slate-700">Settings</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* COMPONENT VIEWS */}
                {activeTab === 'jobs' && (
                    <JobBoard
                        userProfile={user.profile}
                        onNavigateToAgents={(mlaNumber) => {
                            // Set highlighted MLA and switch to agents tab
                            setHighlightedMLA(mlaNumber);
                            setActiveTab('agents');
                        }}
                    />
                )}
                {activeTab === 'documents' && (
                    <Documents
                        documents={documents}
                        onAddDocument={handleAddDocument}
                        onUpdateDocument={handleUpdateDocument}
                        onDeleteDocument={handleDeleteDocument}
                        userName={`${user.profile?.firstName} ${user.profile?.lastName}`}
                    />
                )}
                {activeTab === 'seaservice' && <SeaService records={user.profile?.seaServiceHistory || []} onUpdate={onUpdateSeaService} />}
                {activeTab === 'agents' && (
                    <ManningAgents
                        userProfile={user.profile}
                        highlightedMLA={highlightedMLA}
                        onClearHighlight={() => setHighlightedMLA(null)}
                    />
                )}
                {activeTab === 'medical' && <MedicalCenters />}
                {activeTab === 'community' && <Community user={user} />}
                {activeTab === 'medical' && <MedicalCenters />}
                {activeTab === 'community' && <Community user={user} />}
                {activeTab === 'wellbeing' && <Wellbeing />}
                {activeTab === 'alumni' && <AlumniAssociation />}

                {/* CHAT VIEW */}
                {activeTab === 'chat' && (
                    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Bot className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-800">Sea Mate AI</h3>
                                <p className="text-[10px] text-slate-500">Online</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start"><div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 rounded-bl-none"><div className="flex gap-1"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div></div></div></div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyPress} placeholder="Ask me anything..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" disabled={isLoading} />
                            <button onClick={handleSendMessage} disabled={!input.trim() || isLoading} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"><Send className="w-5 h-5" /></button>
                        </div>
                    </div>
                )}
            </main>

            {/* 3. BOTTOM NAVIGATION BAR - Glassmorphic */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-safe z-40 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 px-1">
                    {[
                        { id: 'home', icon: Home, label: 'Home' },
                        { id: 'jobs', icon: Briefcase, label: 'Jobs' },
                        { id: 'chat', icon: Bot, label: 'Chat' },
                        { id: 'documents', icon: FileText, label: 'Docs' },
                        { id: 'menu', icon: Grid, label: 'Menu' },
                    ].map((item) => {
                        // Check if this tab is active OR if we are in a secondary tab and this is the 'menu' item
                        const isActive = activeTab === item.id || (item.id === 'menu' && isSecondaryTab);
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as TabId)}
                                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 group active:scale-90`}
                            >
                                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-100 text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* 4. PROFILE SHEET OVERLAY */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)}></div>
                    <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 duration-300">
                        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>

                        <div className="flex flex-col items-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-slate-100 mb-3 overflow-hidden border-4 border-white shadow-md">
                                {user.profile?.profilePicture ? (
                                    <img src={user.profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-full h-full p-4 text-slate-300" />
                                )}
                            </div>
                            <h3 className="font-bold text-xl text-slate-800">{user.profile?.firstName} {user.profile?.lastName}</h3>
                            <p className="text-slate-500 text-sm font-medium">{user.profile?.rank}</p>
                            <p className="text-slate-400 text-xs mt-1 font-mono">{user.email}</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => { setIsProfileOpen(false); onEditProfile(); }}
                                className="w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center text-slate-700 font-bold transition-colors"
                            >
                                <Edit className="w-5 h-5 mr-3 text-blue-600" /> Edit Profile
                                <ChevronRight className="w-4 h-4 ml-auto text-slate-300" />
                            </button>
                            <button
                                onClick={() => { setIsProfileOpen(false); onLogout(); }}
                                className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 rounded-xl flex items-center text-red-600 font-bold transition-colors"
                            >
                                <LogOutIcon className="w-5 h-5 mr-3" /> Sign Out
                            </button>
                        </div>

                        <button onClick={() => setIsProfileOpen(false)} className="mt-6 w-full py-3 text-slate-400 text-sm font-semibold hover:text-slate-600">Close</button>
                    </div>
                </div>
            )}

        </div>
    );
};