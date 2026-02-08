import React, { useState, useRef, useEffect } from 'react';
import { User, ChatMessage, MarinerDocument, DocumentCategory, SeaServiceRecord } from '../types';
import { User as UserIcon, LogOut, Send, Bot, Menu, Ship, FileText, Anchor, Edit, Building2, Briefcase, Stethoscope, WifiOff, CheckCircle, X, Palmtree, Users, HeartHandshake, Home, ChevronRight, PanelLeft, ChevronLeft } from 'lucide-react';
import { getGeminiResponse } from '../services/geminiService';
import { Documents } from './Documents';
import { SeaService } from './SeaService';
import { ManningAgents } from './ManningAgents';
import { JobBoard } from './JobBoard';
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

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onEditProfile, onUpdateSeaService, onToggleJobStatus, onToggleOnboardStatus }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'documents' | 'seaservice' | 'agents' | 'jobs' | 'medical' | 'community' | 'wellbeing'>('home');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Welcome aboard, ${user.profile?.rank} ${user.profile?.lastName}! I am Sea Mate, your personal AI assistant. How can I assist you today?`,
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Sidebar State: Collapsed (false) by default (Icons only)
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Status Confirmations
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showOnboardConfirm, setShowOnboardConfirm] = useState(false);

  // Document management
  const [documents, setDocuments] = useState<MarinerDocument[]>([]);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'wellbeing', label: 'Wellbeing', icon: HeartHandshake },
    { id: 'community', label: 'Forum', icon: Users },
    { id: 'seaservice', label: 'Service', icon: Ship },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'documents', label: 'Docs', icon: FileText },
    { id: 'agents', label: 'Agents', icon: Building2 },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'chat', label: 'Chat', icon: Bot },
  ];

  useEffect(() => {
    // Listener for offline status
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
        // Sample Documents for Demo
        setDocuments([
            {
                id: '1',
                title: 'Continuous Discharge Certificate (CDC)',
                expiryDate: '2028-05-12',
                documentNumber: 'C/O/88219',
                fileUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=600',
                uploadDate: Date.now(),
                category: DocumentCategory.PERSONAL_ID
            },
            {
                id: '2',
                title: 'Certificate of Competency (COC)',
                expiryDate: '2025-11-01',
                documentNumber: 'COC-DK-221',
                fileUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80&w=600',
                uploadDate: Date.now() - 10000000,
                category: DocumentCategory.LICENSE
            },
            {
                id: '3',
                title: 'Yellow Fever Vaccination',
                expiryDate: '2024-03-10', // Expiring soon example
                documentNumber: 'YF-9921',
                fileUrl: '', // Will show icon
                uploadDate: Date.now() - 20000000,
                category: DocumentCategory.MEDICAL
            }
        ]);
        return;
    }

    // Try LocalStorage first (Offline Strategy)
    if (user.profile && user.email) {
        const cachedDocs = localStorage.getItem(`bd_mariner_docs_${user.email}`);
        if (cachedDocs) {
            try {
                setDocuments(JSON.parse(cachedDocs));
            } catch (e) {
                console.error("Failed to load cached docs");
            }
        }
    }

    if (!navigator.onLine) return; // Don't try fetch if offline

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('expiry_date', { ascending: true });

      if (error) throw error;

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
        
        if (user.email) {
            localStorage.setItem(`bd_mariner_docs_${user.email}`, JSON.stringify(mappedDocs));
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (isOffline) {
        const errorMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: "I am currently offline. Please connect to the internet to chat.",
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const responseText = await getGeminiResponse(userMsg.text, history);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddDocument = (doc: MarinerDocument) => {
    if (isMockMode) {
        setDocuments(prev => [...prev, doc]);
    } else {
        fetchDocuments();
    }
  };

  const handleUpdateDocument = (updatedDoc: MarinerDocument) => {
    if (isMockMode) {
        setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    } else {
        fetchDocuments();
    }
  };

  const handleDeleteDocument = (id: string) => {
     setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans text-slate-900">
      
      {/* Mobile Overlay for Expanded State */}
      {isExpanded && (
        <div 
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-40 lg:hidden transition-all duration-300" 
            onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar Navigation - Floating, Centered, Narrower */}
      <aside 
        className={`fixed left-3 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ease-in-out flex flex-col border border-white/20 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden max-h-[90vh] ${
            isExpanded 
            ? 'w-64 bg-white/90' // More opaque when expanded
            : 'w-14 bg-white/20 hover:bg-white/30' // Narrower collapsed state (56px)
        }`}
      >
         {/* Header / Toggle */}
         <div className="h-14 flex items-center px-0 justify-center relative shrink-0">
            {/* Logo Icon - Always Visible */}
             <button 
                className="cursor-pointer flex flex-col items-center justify-center p-2 rounded-xl transition-transform hover:scale-105 active:scale-95 group"
                onClick={() => setIsExpanded(!isExpanded)}
             >
                <div className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-blue-600 text-white' : 'bg-white/40 text-blue-700 shadow-sm'}`}>
                    <Anchor className="w-5 h-5" />
                </div>
             </button>
             
             {/* Text - Only Visible when Expanded */}
             <div className={`absolute left-14 top-0 bottom-0 flex items-center overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                <div className="pl-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <h1 className="font-bold text-lg tracking-tight whitespace-nowrap text-slate-800">MarinerHub</h1>
                </div>
             </div>
             
             {/* Toggle Icon */}
             <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className={`absolute -right-3 top-5 bg-white border border-slate-100 p-0.5 rounded-full text-slate-400 shadow-sm hover:text-blue-600 hover:scale-110 transition-all hidden lg:block`}
             >
                 {isExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
             </button>
         </div>

         {/* Nav Links */}
         <div className="flex-1 overflow-y-auto py-2 space-y-1 overflow-x-hidden scrollbar-hide px-2">
            {navItems.map(item => (
               <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as any); if (window.innerWidth < 1024) setIsExpanded(false); }}
                  className={`w-full flex items-center relative transition-all group rounded-xl ${
                     isExpanded ? 'px-3 py-3 justify-start' : 'px-0 py-3 justify-center'
                  } ${
                     activeTab === item.id 
                     ? 'bg-white/60 text-blue-700 shadow-sm backdrop-blur-sm' 
                     : 'text-slate-600 hover:bg-white/40 hover:text-slate-900'
                  }`}
               >
                  <div className={`relative z-10 transition-transform ${isExpanded ? '' : 'group-hover:scale-110'}`}>
                     <item.icon className={`w-5 h-5 stroke-[2px] ${activeTab === item.id ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                  </div>
                  
                  {/* Label - Sliding Animation */}
                  <span className={`whitespace-nowrap ml-3 font-medium text-sm transition-all duration-300 ${
                      isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute left-14 pointer-events-none'
                  }`}>
                      {item.label}
                  </span>

                  {/* Tooltip for collapsed state (Desktop only) */}
                  {!isExpanded && (
                      <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800/90 backdrop-blur text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl hidden lg:block animate-in fade-in slide-in-from-left-2">
                          {item.label}
                      </div>
                  )}
               </button>
            ))}
         </div>

         {/* User Footer */}
         <div className="p-2 shrink-0 mb-1">
             <div className={`flex items-center transition-all ${isExpanded ? 'bg-slate-50/80 p-2 rounded-xl border border-slate-100 gap-3' : 'justify-center bg-transparent'}`}>
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-white/50 shrink-0 cursor-pointer hover:border-blue-300 transition-colors shadow-sm" onClick={() => setIsExpanded(!isExpanded)}>
                  {user.profile?.profilePicture ? (
                    <img src={user.profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-full h-full p-1.5 text-slate-400" />
                  )}
                </div>
                
                {isExpanded && (
                    <div className="overflow-hidden flex-1 min-w-0">
                        <h4 className="font-bold text-xs truncate text-slate-800">{user.profile?.firstName}</h4>
                        <button onClick={onLogout} className="text-[10px] text-slate-500 hover:text-red-500 flex items-center gap-1 mt-0.5 font-medium transition-colors">
                            <LogOut className="w-3 h-3" /> Sign Out
                        </button>
                    </div>
                )}
             </div>
         </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out relative ${
            // Layout Logic:
            // Mobile: ml-20 to clear floating sidebar
            // Desktop: ml-20 (Collapsed) or lg:ml-72 (Expanded to clear wider sidebar + margin)
            isExpanded ? 'lg:ml-72 ml-20' : 'ml-20'
        }`}
      >
         
         {/* Content Scroll Area */}
         <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 w-full scroll-smooth">
            <div className="max-w-6xl mx-auto w-full h-full">
               
               {activeTab === 'home' && (
                  <div className="space-y-6 animate-fade-in">
                     {/* Welcome Banner */}
                     <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl">
                        {/* Background Decoration (Clipped) */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                            <div className="absolute right-0 bottom-0 opacity-10">
                                <Anchor className="w-48 h-48 -mr-10 -mb-10 text-white" />
                            </div>
                        </div>

                        {/* Content (Unclipped for Dropdowns) */}
                        <div className="relative z-10 p-6 text-white">
                           <h2 className="text-2xl font-bold mb-2">Hello, {user.profile?.firstName}! 👋</h2>
                           <p className="text-blue-100 mb-6 max-w-lg">
                              Your maritime career dashboard is ready. You have {documents.length} documents and {user.profile?.seaServiceHistory?.length || 0} sea service records.
                           </p>
                           
                           <div className="flex flex-col sm:flex-row gap-3">
                              <button 
                                 onClick={onEditProfile}
                                 className="px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors flex items-center justify-center sm:justify-start"
                              >
                                 <Edit className="w-4 h-4 mr-2" /> Edit Profile
                              </button>
                              
                              <div className="flex gap-3 w-full sm:w-auto flex-1 sm:flex-none items-stretch">
                                {/* Job Status Toggle */}
                                <div className="relative flex-1 sm:flex-none">
                                   <button 
                                      onClick={() => setShowStatusConfirm(!showStatusConfirm)}
                                      className={`w-full h-full sm:min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center shadow-sm ${user.profile?.isOpenForWork ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                   >
                                      <Briefcase className="w-4 h-4 mr-2 flex-shrink-0" />
                                      {user.profile?.isOpenForWork ? 'Open to Work' : 'Unavailable'}
                                   </button>
                                   {showStatusConfirm && (
                                       <div className="absolute top-full mt-2 left-0 w-48 bg-white text-slate-800 p-3 rounded-xl shadow-xl border border-slate-100 z-50 animate-in zoom-in-95 origin-top-left">
                                          <p className="text-xs mb-2 font-medium">Change Job Status?</p>
                                          <div className="flex gap-2">
                                              <button onClick={() => { onToggleJobStatus(!user.profile?.isOpenForWork); setShowStatusConfirm(false); }} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors">Yes</button>
                                              <button onClick={() => setShowStatusConfirm(false)} className="flex-1 bg-slate-100 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-200 transition-colors">No</button>
                                          </div>
                                       </div>
                                   )}
                                </div>

                                {/* Onboard Status Toggle */}
                                <div className="relative flex-1 sm:flex-none">
                                   <button 
                                      onClick={() => setShowOnboardConfirm(!showOnboardConfirm)}
                                      className={`w-full h-full sm:min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center shadow-sm ${user.profile?.isOnboard ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                                   >
                                      {user.profile?.isOnboard ? <Ship className="w-4 h-4 mr-2 flex-shrink-0" /> : <Palmtree className="w-4 h-4 mr-2 flex-shrink-0" />}
                                      {user.profile?.isOnboard ? 'Onboard' : 'On Leave'}
                                   </button>
                                   {showOnboardConfirm && (
                                       <div className="absolute top-full mt-2 left-0 w-48 bg-white text-slate-800 p-3 rounded-xl shadow-xl border border-slate-100 z-50 animate-in zoom-in-95 origin-top-left">
                                          <p className="text-xs mb-2 font-medium">Change Onboard Status?</p>
                                          <div className="flex gap-2">
                                              <button onClick={() => { onToggleOnboardStatus(!user.profile?.isOnboard); setShowOnboardConfirm(false); }} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors">Yes</button>
                                              <button onClick={() => setShowOnboardConfirm(false)} className="flex-1 bg-slate-100 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-200 transition-colors">No</button>
                                          </div>
                                       </div>
                                   )}
                                </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Quick Actions Grid */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => setActiveTab('documents')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group">
                           <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <FileText className="w-6 h-6" />
                           </div>
                           <h3 className="font-bold text-slate-700">Documents</h3>
                           <p className="text-xs text-slate-500 mt-1">{documents.length} Uploaded</p>
                        </button>
                        <button onClick={() => setActiveTab('seaservice')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group">
                           <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <Ship className="w-6 h-6" />
                           </div>
                           <h3 className="font-bold text-slate-700">Sea Service</h3>
                           <p className="text-xs text-slate-500 mt-1">{user.profile?.seaServiceHistory?.length || 0} Records</p>
                        </button>
                        <button onClick={() => setActiveTab('jobs')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group">
                           <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <Briefcase className="w-6 h-6" />
                           </div>
                           <h3 className="font-bold text-slate-700">Find Jobs</h3>
                           <p className="text-xs text-slate-500 mt-1">Explore Openings</p>
                        </button>
                        <button onClick={() => setActiveTab('chat')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group">
                           <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <Bot className="w-6 h-6" />
                           </div>
                           <h3 className="font-bold text-slate-700">Sea Mate AI</h3>
                           <p className="text-xs text-slate-500 mt-1">Ask Assistance</p>
                        </button>
                     </div>

                     {/* Recent Updates / Community Teaser */}
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Community Highlights</h3>
                            <button onClick={() => setActiveTab('community')} className="text-xs font-semibold text-blue-600 hover:underline">View Forum</button>
                        </div>
                        <div className="p-4">
                            <div className="space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Users className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Check out the latest discussions on Chittagong Port delays.</p>
                                        <p className="text-xs text-slate-400 mt-1">Posted in Deck Dept • 2h ago</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <HeartHandshake className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">New wellbeing tips added: Dealing with isolation at sea.</p>
                                        <p className="text-xs text-slate-400 mt-1">Sea Mind • 5h ago</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                  </div>
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

               {activeTab === 'seaservice' && (
                  <SeaService records={user.profile?.seaServiceHistory || []} onUpdate={onUpdateSeaService} />
               )}

               {activeTab === 'agents' && (
                  <ManningAgents userProfile={user.profile} />
               )}

               {activeTab === 'jobs' && (
                  <JobBoard userProfile={user.profile} />
               )}

               {activeTab === 'medical' && (
                  <MedicalCenters />
               )}

               {activeTab === 'community' && (
                  <Community user={user} />
               )}

               {activeTab === 'wellbeing' && (
                  <Wellbeing />
               )}

               {activeTab === 'chat' && (
                  <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                     {/* Chat Header */}
                     <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                           <Bot className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-800">Sea Mate</h3>
                           <p className="text-xs text-slate-500">AI Assistant • Always Online</p>
                        </div>
                     </div>

                     {/* Messages */}
                     <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {messages.map((msg) => (
                           <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm text-sm leading-relaxed ${
                                 msg.role === 'user' 
                                 ? 'bg-blue-600 text-white rounded-br-none' 
                                 : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                              }`}>
                                 {msg.role === 'model' ? (
                                     // Basic Markdown-ish rendering
                                     msg.text.split('\n').map((line, i) => (
                                        <p key={i} className={`min-h-[1rem] ${line.startsWith('-') || line.startsWith('*') ? 'pl-2' : ''}`}>
                                           {line}
                                        </p>
                                     ))
                                 ) : (
                                     msg.text
                                 )}
                              </div>
                           </div>
                        ))}
                        {isLoading && (
                           <div className="flex justify-start">
                              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 rounded-bl-none flex items-center gap-2">
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                              </div>
                           </div>
                        )}
                        <div ref={messagesEndRef} />
                     </div>

                     {/* Input */}
                     <div className="p-4 bg-white border-t border-slate-100">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                           <input
                              type="text"
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={handleKeyPress}
                              placeholder="Ask about regulations, career, etc..."
                              className="flex-1 bg-transparent border-none outline-none px-2 text-sm text-slate-700 placeholder:text-slate-400"
                              disabled={isLoading}
                           />
                           <button 
                              onClick={handleSendMessage}
                              disabled={!input.trim() || isLoading}
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                           >
                              <Send className="w-4 h-4" />
                           </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                           AI can make mistakes. Check important info.
                        </p>
                     </div>
                  </div>
               )}

            </div>
         </div>
      </main>
    </div>
  );
};