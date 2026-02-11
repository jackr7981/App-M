import React, { useState, useEffect } from 'react';
import { AppView, Department, Rank, User, UserProfile, SeaServiceRecord, ShipType } from './types';
import { Logo } from './components/Logo';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard'; // Import Admin Dashboard
import { ArrowRight, Mail, Lock, Upload, Calendar, Phone, CheckCircle, User as UserIcon, Loader2, Search, Globe, RefreshCw, ShieldCheck, X, AlertTriangle, WifiOff, Ship, HelpCircle, ArrowLeft, Anchor } from 'lucide-react';
import { supabase, getStorageUrl, isMockMode, isConfigured } from './services/supabase';
import { formatDate } from './utils/format';
import { SessionTracker } from './components/SessionTracker';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot Password States
  const [forgotRecoveryType, setForgotRecoveryType] = useState<'password' | 'username'>('password');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMobile, setRecoveryMobile] = useState('+880');

  // Profile States
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    department: '',
    rank: '',
    preferredShipType: '',
    mobileNumber: '+880'
  });
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);

  // DOS Import States
  const [showDosModal, setShowDosModal] = useState(false);
  const [dosLoading, setDosLoading] = useState(false);
  const [dosUrl, setDosUrl] = useState('');
  const [dosError, setDosError] = useState<string | null>(null);
  const [dosStep, setDosStep] = useState<'instructions' | 'paste_url' | 'fetching' | 'success'>('instructions');

  useEffect(() => {
    // Network Status Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check active session
    const checkSession = async () => {
      if (!isConfigured) {
        console.warn("Supabase not configured, skipping session check.");
        setAuthChecking(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session?.user) {
          // Attempt to load from offline cache first to speed up UI
          const cachedProfile = localStorage.getItem(`bd_mariner_profile_${session.user.id}`);
          if (cachedProfile) {
            const parsedUser = JSON.parse(cachedProfile);
            setCurrentUser(parsedUser);
            setCurrentView(AppView.DASHBOARD);
            // Don't stop checking, we still want fresh data if online
          }

          if (navigator.onLine) {
            await fetchUserProfile(session.user.id, session.user.email!);
          } else if (!cachedProfile) {
            // If offline and no cache, stop
            setAuthChecking(false);
          } else {
            // If offline but had cache, we are good
            setAuthChecking(false);
          }
        } else {
          setAuthChecking(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthChecking(false);
      }
    };

    checkSession();

    if (isConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email!);
        } else {
          setCurrentUser(null);
          // Only redirect to landing if we are not in specific flows like forgot password
          if (currentView !== AppView.FORGOT_PASSWORD) {
            setCurrentView(AppView.LANDING);
          }
          setAuthChecking(false);
        }
      });
      return () => {
        subscription.unsubscribe();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // INACTIVITY LOGOUT LOGIC
  useEffect(() => {
    if (!currentUser) return; // Only track if logged in

    const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 Minutes
    let logoutTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        // Double check user presence to avoid race
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            handleLogout();
            alert("Session expired due to inactivity. You have been logged out.");
          }
        });
      }, TIMEOUT_DURATION);
    };

    // Events to track user activity
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

    // Attach listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial start
    resetTimer();

    // Cleanup
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]); // Re-run when user logs in/out

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, go to setup
          const user: User = { id: userId, email: email, isVerified: true };
          setCurrentUser(user);
          setCurrentView(AppView.PROFILE_SETUP);
          return;
        }
        console.error('Error fetching profile:', error);
      }

      const user: User = {
        id: userId,
        email: email,
        isVerified: true, // Supabase handles verification
      };

      if (data) {
        user.profile = {
          firstName: data.first_name,
          lastName: data.last_name,
          department: data.department as Department,
          rank: data.rank,
          cdcNumber: data.cdc_number,
          mobileNumber: data.mobile_number,
          dateOfBirth: data.date_of_birth,
          profilePicture: data.profile_picture_url ? getStorageUrl('avatars', data.profile_picture_url) : null,
          seaServiceHistory: data.sea_service_history || [],
          preferredShipType: data.preferred_ship_type || '',
          isOpenForWork: data.is_open_for_work || false,
          isOnboard: data.is_onboard || false,
          totalUsageMinutes: data.total_usage_minutes || 0,
        };

        // Update State
        setCurrentUser(user);

        // Update Cache
        localStorage.setItem(`bd_mariner_profile_${userId}`, JSON.stringify(user));

        setCurrentView(AppView.DASHBOARD);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleAuthError = (error: any) => {
    console.error(error);
    if (error.message === 'Failed to fetch') {
      alert("Connection Error: Unable to reach the server.\n\nPossible causes:\n1. Check your internet connection.\n2. Ensure Supabase URL is correct in settings.");
    } else {
      alert(error.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) { alert("You are offline. Please connect to the internet to register."); return; }
    if (!isConfigured) { alert("App is not configured. Please add Supabase Credentials."); return; }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // Auto-logged in
      } else if (data.user) {
        alert('Check your email for the verification link!');
        setCurrentView(AppView.VERIFY_EMAIL);
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) { alert("You are offline. Please connect to the internet to login."); return; }
    if (!isConfigured) { alert("App is not configured. Please add Supabase Credentials."); return; }

    setLoading(true);

    if (email === 'admin@bdmarinerhub.com' && password === 'admin123') {
      setTimeout(() => {
        setCurrentView(AppView.ADMIN_DASHBOARD);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  // PASSWORD RECOVERY & USER ID RECOVERY
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (forgotRecoveryType === 'password') {
        // Send Password Reset
        const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
          redirectTo: window.location.origin, // Redirect back to this app
        });
        if (error) throw error;
        alert(`Password reset link sent to ${recoveryEmail}. Please check your inbox.`);
        setCurrentView(AppView.LOGIN);
      } else {
        // Find User ID (Email) via Mobile
        // Note: This requires the profiles table to be readable
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('mobile_number', recoveryMobile)
          .single();

        if (error || !data) {
          alert("No account found with this mobile number.");
        } else {
          alert(`Your User ID (Email) is: ${data.email}`);
          setEmail(data.email); // Pre-fill login
          setCurrentView(AppView.LOGIN);
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) { alert("Cannot update profile while offline."); return; }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let profilePicPath = null;
      if (profilePicFile) {
        const fileExt = profilePicFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, profilePicFile);

          if (uploadError) throw uploadError;
          profilePicPath = fileName;
        } catch (uploadError: any) {
          if (uploadError.message.includes("Bucket not found")) {
            alert("Error: Storage 'avatars' bucket missing. Please run the SQL setup script.");
          } else {
            throw uploadError;
          }
        }
      }

      const profilePayload = {
        id: user.id,
        email: user.email, // Store email in profile for recovery
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        department: profileData.department,
        rank: profileData.rank,
        cdc_number: profileData.cdcNumber,
        mobile_number: profileData.mobileNumber,
        date_of_birth: profileData.dateOfBirth,
        preferred_ship_type: profileData.preferredShipType,
        ...(profilePicPath && { profile_picture_url: profilePicPath })
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profilePayload);

      if (error) {
        if (error.message.includes('relation "public.profiles" does not exist') || error.message.includes("Could not find the table")) {
          alert("DATABASE CONFIGURATION ERROR\n\nThe 'profiles' table exists in Postgres but Supabase API doesn't see it yet.\n\nPLEASE FIX:\n1. Go to Supabase Dashboard\n2. Navigate to Project Settings > API\n3. Click 'Reload schema cache' button");
        } else {
          throw error;
        }
      } else {
        await fetchUserProfile(user.id, user.email!);
      }

    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSeaService = async (records: SeaServiceRecord[]) => {
    if (!currentUser || !currentUser.profile) return;
    if (isOffline) { alert("You are offline. Changes will not be saved."); return; }

    const updatedUser = {
      ...currentUser,
      profile: {
        ...currentUser.profile,
        seaServiceHistory: records
      }
    };

    // Optimistic update
    setCurrentUser(updatedUser);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update Cache
        localStorage.setItem(`bd_mariner_profile_${user.id}`, JSON.stringify(updatedUser));

        // Update DB
        await supabase.from('profiles').update({
          sea_service_history: records
        }).eq('id', user.id);
      }
    } catch (e) {
      console.error("Failed to save sea service", e);
      alert("Failed to save sea service. Check connection.");
    }
  };

  const handleToggleJobStatus = async (newStatus: boolean) => {
    if (!currentUser || !currentUser.profile) return;
    if (isOffline) { alert("You are offline. Cannot update status."); return; }

    const updatedUser = {
      ...currentUser,
      profile: { ...currentUser.profile, isOpenForWork: newStatus }
    };
    setCurrentUser(updatedUser);

    try {
      // Optimistic update
      const { error } = await supabase.from('profiles').update({ is_open_for_work: newStatus }).eq('id', currentUser.id);
      if (error) {
        console.error(error);
        // Revert on error
        setCurrentUser(currentUser);
        alert("Failed to update status.");
      } else {
        localStorage.setItem(`bd_mariner_profile_${currentUser.id}`, JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  const handleToggleOnboardStatus = async (onboardStatus: boolean) => {
    if (!currentUser || !currentUser.profile) return;
    if (isOffline) { alert("You are offline. Cannot update status."); return; }

    const updatedUser = {
      ...currentUser,
      profile: { ...currentUser.profile, isOnboard: onboardStatus }
    };
    setCurrentUser(updatedUser);

    try {
      // Optimistic update
      const { error } = await supabase.from('profiles').update({ is_onboard: onboardStatus }).eq('id', currentUser.id);
      if (error) {
        console.error(error);
        setCurrentUser(currentUser);
        alert("Failed to update onboard status.");
      } else {
        localStorage.setItem(`bd_mariner_profile_${currentUser.id}`, JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
        setProfileData({ ...profileData, profilePicture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // CDC VERIFY EDGE FUNCTION URL
  const CDC_VERIFY_URL = 'https://zlgfadgwlwreezwegpkx.supabase.co/functions/v1/cdc-verify';
  const DOS_WEBSITE_URL = 'https://erp.gso.gov.bd/cdc-search/';

  // DOS IMPORT LOGIC
  const openDosModal = () => {
    if (isOffline) {
      alert("DOS Import requires internet connection.");
      return;
    }
    if (!profileData.cdcNumber || !profileData.dateOfBirth) {
      alert("Please enter your CDC Number and Date of Birth first.");
      return;
    }
    setDosStep('instructions');
    setDosUrl('');
    setDosError(null);
    setShowDosModal(true);
  };

  const openDosWebsite = () => {
    window.open(DOS_WEBSITE_URL, '_blank');
    setDosStep('paste_url');
  };

  const handleDosSubmit = async () => {
    if (!dosUrl.trim()) {
      setDosError('Please paste the details page URL.');
      return;
    }

    setDosLoading(true);
    setDosError(null);
    setDosStep('fetching');

    try {
      const res = await fetch(CDC_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape_details',
          url: dosUrl.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setDosStep('paste_url');
        setDosError(data.error || 'Failed to fetch data from the provided URL.');
        setDosLoading(false);
        return;
      }

      const cdcInfo = data.cdcInfo;

      // ── Update profile details ──
      if (cdcInfo?.details && Object.keys(cdcInfo.details).length > 0) {
        const details = cdcInfo.details;
        setProfileData(prev => ({
          ...prev,
          firstName: details['Name'] || details['SEAFARER NAME'] || details['Seafarer Name'] || details['name'] || prev.firstName,
          lastName: details['Surname'] || details['surname'] || prev.lastName,
        }));
      }

      // ── Auto-populate sea service records ──
      if (cdcInfo?.seaServiceRecords && cdcInfo.seaServiceRecords.length > 0) {
        // DEBUG: Log the raw headers and first record to see actual CDC column names
        console.log('[CDC Import] Table headers from page:', JSON.stringify(cdcInfo.tableHeaders));
        console.log('[CDC Import] First record keys:', Object.keys(cdcInfo.seaServiceRecords[0]));
        console.log('[CDC Import] First record:', JSON.stringify(cdcInfo.seaServiceRecords[0]));
        console.log('[CDC Import] Total records:', cdcInfo.seaServiceRecords.length);

        const importedRecords: SeaServiceRecord[] = cdcInfo.seaServiceRecords.map((row: Record<string, string>, idx: number) => {
          // Log every row for debugging
          console.log(`[CDC Import] Row ${idx}:`, JSON.stringify(row));

          // Build a normalized lookup: lowercase key -> value
          const lk: Record<string, string> = {};
          Object.entries(row).forEach(([k, v]) => { lk[k.toLowerCase().trim()] = v; });

          // Helper: find value by any partial key match (case-insensitive)
          const findVal = (...patterns: string[]): string => {
            for (const p of patterns) {
              for (const [k, v] of Object.entries(lk)) {
                if (k.includes(p.toLowerCase()) && v && v.trim()) return v.trim();
              }
            }
            return '';
          };

          // Parse dates from various formats
          const parseDate = (raw: string): string => {
            if (!raw) return '';
            const cleaned = raw.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
            // dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy
            const parts = cleaned.split(/[-\/\.]/);
            if (parts.length === 3) {
              const [a, b, c] = parts.map(s => s.trim());
              if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
              if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
            }
            // Try Date.parse as last resort
            const d = new Date(cleaned);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return cleaned;
          };

          // Try MANY possible header variations
          const vesselName = findVal('ship', 'vessel', 'ship name', 'vessel name')
            || findVal('name')
            || Object.values(row)[0] // Fallback: first column is often ship name
            || `Vessel ${idx + 1}`;

          const rank = findVal('rank', 'capacity', 'designation', 'engaged as', 'position');

          // Dates - try many variations including col_ fallback positions
          const signOnDate = parseDate(
            findVal('sign on', 'sign-on', 'sign_on', 'joining', 'join', 'from', 'embark', 'engagement', 'on date', 'signon')
          );
          const signOffDate = parseDate(
            findVal('sign off', 'sign-off', 'sign_off', 'leaving', 'leave', 'to date', 'disembark', 'discharge', 'off date', 'signoff', 'relieved')
          );

          const imoNumber = findVal('imo', 'imo no', 'imo number', 'i.m.o');
          // _shipType is injected by the Edge Function from VesselFinder lookup
          const shipType = row['_shipType'] || findVal('type', 'ship type', 'vessel type');

          return {
            id: `cdc_import_${Date.now()}_${idx}`,
            vesselName,
            rank,
            shipType,
            signOnDate,
            signOffDate,
            imoNumber,
          } as SeaServiceRecord;
        });

        // On re-import: remove old CDC-imported records and replace with fresh data
        const existingRecords = currentUser?.profile?.seaServiceHistory || [];
        const manualRecords = existingRecords.filter(r => !r.id.startsWith('cdc_import_'));
        const merged = [...manualRecords, ...importedRecords];
        handleUpdateSeaService(merged);
      }

      // Handle note (e.g. "this is a search results page")
      if (cdcInfo?.note && !cdcInfo?.detailsAvailable) {
        setDosStep('paste_url');
        setDosError(cdcInfo.note);
        setDosLoading(false);
        return;
      }

      setDosStep('success');
      setDosLoading(false);

      setTimeout(() => {
        setShowDosModal(false);
      }, 2500);

    } catch (err) {
      setDosStep('paste_url');
      setDosError('Network error: Could not reach verification server.');
      setDosLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleEditProfile = () => {
    if (currentUser?.profile) {
      setProfileData(currentUser.profile);
      setProfilePicPreview(currentUser.profile.profilePicture);
      setCurrentView(AppView.PROFILE_SETUP);
    }
  };

  // Helper to get ranks based on department
  const getRanksForDepartment = (dept: string): string[] => {
    switch (dept) {
      case Department.DECK:
        return [Rank.MASTER, Rank.CHIEF_OFFICER, Rank.SECOND_OFFICER, Rank.THIRD_OFFICER, Rank.FOURTH_OFFICER, Rank.DECK_CADET];
      case Department.ENGINE:
        return [Rank.CHIEF_ENGINEER, Rank.SECOND_ENGINEER, Rank.THIRD_ENGINEER, Rank.FOURTH_ENGINEER, Rank.FIFTH_ENGINEER, Rank.ENGINE_CADET];
      case Department.ELECTRICAL:
        return [Rank.ELECTRICAL_OFFICER];
      case Department.GALLEY:
        return [Rank.CHIEF_COOK, Rank.MESSMAN];
      case Department.DECK_RATINGS:
        return [Rank.BOSUN, Rank.ABLE_SEAMAN, Rank.ORDINARY_SEAMAN];
      case Department.ENGINE_RATINGS:
        return [Rank.FITTER, Rank.MOTORMAN, Rank.OILER, Rank.WIPER, Rank.WELDER];
      case Department.CREWING:
        return [Rank.CREW_MANAGER];
      case Department.AGENCY:
        return [Rank.AGENT];
      default:
        return [Rank.OTHER];
    }
  };

  // RENDER HELPERS
  const renderInput = (label: string, value: string, onChange: (val: string) => void, type = "text", placeholder = "", icon?: React.ReactNode, extraAction?: React.ReactNode) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          {icon && <div className="absolute left-3 top-3 text-slate-400">{icon}</div>}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required
            className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
          />
        </div>
        {extraAction}
      </div>
    </div>
  );

  const renderSelect = (label: string, value: string, onChange: (val: string) => void, options: string[]) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white transition-all"
          required
        >
          <option value="" disabled>Select {label}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="absolute right-3 top-3 pointer-events-none">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>
  );

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  // VIEWS
  if (currentView === AppView.LANDING) {
    return (
      <div className="min-h-screen bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
        {/* Background Decorative */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1548293777-62b166299971?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>

        <div className="relative z-10 max-w-md w-full animate-fade-in-up">
          <Logo size="lg" color="white" />
          <p className="mt-4 text-slate-300 text-lg">Your professional companion for a seamless maritime career.</p>

          <div className="mt-10 space-y-4">
            <button
              onClick={() => setCurrentView(AppView.LOGIN)}
              className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-transform active:scale-95 shadow-lg shadow-blue-900/50"
            >
              Sign In
            </button>
            <button
              onClick={() => setCurrentView(AppView.REGISTER)}
              className="w-full py-3.5 px-6 bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-semibold text-lg backdrop-blur-sm transition-transform active:scale-95"
            >
              Create Account
            </button>
          </div>

          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <span className="text-xs text-slate-400 font-medium tracking-wide">Designed for Bangladeshi Mariners 🇧🇩</span>
            </div>
            <p className="text-blue-200 font-medium text-sm tracking-wide">Built by a Mariner for Mariners</p>
          </div>
        </div>
      </div>
    );
  }

  // FORGOT PASSWORD / RECOVER ID VIEW
  if (currentView === AppView.FORGOT_PASSWORD) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-6 bg-slate-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <button onClick={() => setCurrentView(AppView.LOGIN)} className="mb-4 flex items-center text-slate-500 hover:text-slate-700 text-sm font-bold">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
          </button>
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-100">
            <div className="text-center mb-6">
              <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-3 bg-blue-50 rounded-full p-2" />
              <h2 className="text-2xl font-bold text-slate-900">Account Recovery</h2>
              <p className="text-sm text-slate-500 mt-1">Reset your password or find your user ID</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                className={`flex-1 py-2 text-sm font-bold border-b-2 ${forgotRecoveryType === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
                onClick={() => setForgotRecoveryType('password')}
              >
                Reset Password
              </button>
              <button
                className={`flex-1 py-2 text-sm font-bold border-b-2 ${forgotRecoveryType === 'username' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
                onClick={() => setForgotRecoveryType('username')}
              >
                Find User ID
              </button>
            </div>

            <form onSubmit={handleRecover} className="space-y-4">
              {forgotRecoveryType === 'password' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter registered email</label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="captain@example.com"
                    className="w-full pl-4 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">We will send a password reset link to this email.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter registered mobile</label>
                  <input
                    type="tel"
                    required
                    value={recoveryMobile}
                    onChange={(e) => setRecoveryMobile(e.target.value)}
                    placeholder="+880..."
                    className="w-full pl-4 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">We will try to find the User ID (Email) associated with this number.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (forgotRecoveryType === 'password' ? 'Send Reset Link' : 'Find User ID')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === AppView.LOGIN || currentView === AppView.REGISTER) {
    const isLogin = currentView === AppView.LOGIN;
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Logo size="md" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          {isOffline && (
            <p className="text-xs text-center text-red-600 bg-red-50 p-2 rounded mt-2 border border-red-200 flex items-center justify-center">
              <WifiOff className="w-3 h-3 mr-1" /> Offline: Please check your internet.
            </p>
          )}
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
            <form className="space-y-6" onSubmit={isLogin ? handleLogin : handleRegister}>
              {renderInput("Email Address (User ID)", email, setEmail, "email", "captain@example.com", <Mail className="w-5 h-5" />)}
              {renderInput("Password", password, setPassword, "password", "••••••••", <Lock className="w-5 h-5" />)}

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentView(AppView.FORGOT_PASSWORD)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot Password / User ID?
                  </button>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || isOffline}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    isLogin ? 'Sign In' : 'Sign Up'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => alert("Google Login needs Supabase configured!")} className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.17c-.22-.66-.35-1.36-.35-2.17s.13-1.51.35-2.17V7.01H2.18C.79 9.78 0 12.89 0 16c0 3.11.79 6.22 2.18 8.99l3.66-2.82z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.66 2.82c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                  Google
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentView(isLogin ? AppView.REGISTER : AppView.LOGIN)}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === AppView.VERIFY_EMAIL) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-slate-100">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Verify your email</h3>
          <p className="text-slate-500 mb-8">
            We've sent a verification link to <span className="font-semibold text-slate-800">{email}</span>. Please click the link in your inbox.
          </p>

          <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg mb-4 text-left">
            <p className="font-bold mb-1">Testing Note:</p>
            If the link redirects to localhost and you are on a live URL, you may need to update your Supabase Auth Site URL.
          </div>

          <button
            onClick={() => window.location.reload()}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> I have verified (Reload)
          </button>

          <button
            onClick={handleLogout}
            className="mt-4 text-sm text-slate-400 hover:text-slate-600"
          >
            Cancel & Logout
          </button>
        </div>
      </div>
    );
  }

  if (currentView === AppView.ADMIN_DASHBOARD) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (currentView === AppView.PROFILE_SETUP) {
    // ... Profile Setup Implementation (same as before) ...
    const ranks = getRanksForDepartment(profileData.department || '');
    const isEditing = !!currentUser?.profile;

    return (
      <div className="min-h-screen pb-12">
        <div className="bg-blue-900 h-48 w-full absolute top-0 z-0"></div>
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-600 text-white text-xs font-bold text-center py-1 flex items-center justify-center shadow-md">
            <WifiOff className="w-3 h-3 mr-2" />
            You are offline. Profile updates are disabled.
          </div>
        )}

        <div className="relative z-10 container mx-auto px-4 pt-12 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">{isEditing ? 'Update Profile' : 'Complete Your Profile'}</h1>
            <p className="text-blue-200 mt-2">{isEditing ? 'Keep your information up to date.' : "Let's get your professional profile ship-shape."}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
            <form onSubmit={handleProfileSubmit} className="p-8 space-y-6">
              {/* Form Content - Same as before */}

              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative w-32 h-32 mb-4">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 shadow-inner flex items-center justify-center">
                    {profilePicPreview ? (
                      <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-300">
                        <UserIcon className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <label htmlFor="pic-upload" className={`absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110 ${isOffline ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Upload className="w-5 h-5" />
                  </label>
                  <input id="pic-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isOffline} />
                </div>
                <p className="text-sm text-slate-500">Upload a professional photo (Uniform preferred)</p>
              </div>

              {/* Personal Info Group */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-blue-600" /> Official Verification</h3>
                <div className="grid grid-cols-1 gap-4">
                  {/* Date Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-3 text-slate-400"><Calendar className="w-5 h-5" /></div>
                        <input
                          type="date"
                          value={profileData.dateOfBirth || ''}
                          onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Input Format: As per system settings (Usually MM/DD/YYYY). Will display as DD/MM/YYYY.</p>
                  </div>

                  {renderInput(
                    "CDC Number",
                    profileData.cdcNumber || '',
                    (v) => setProfileData({ ...profileData, cdcNumber: v }),
                    "text",
                    "C/O/...",
                    <CheckCircle className="w-5 h-5" />,
                    // SEARCH BUTTON
                    <button
                      type="button"
                      onClick={openDosModal}
                      disabled={isOffline}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg flex items-center font-medium shadow-sm transition-colors disabled:opacity-50"
                      title="Import from DOS"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Import</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInput("First Name", profileData.firstName || '', (v) => setProfileData({ ...profileData, firstName: v }), "text", "e.g. Mohammad")}
                {renderInput("Last Name", profileData.lastName || '', (v) => setProfileData({ ...profileData, lastName: v }), "text", "e.g. Rahim")}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderSelect(
                  "Department",
                  profileData.department || '',
                  (v) => setProfileData({ ...profileData, department: v as Department, rank: '' }), // Reset rank on dept change
                  Object.values(Department)
                )}
                {renderSelect(
                  "Rank",
                  profileData.rank || '',
                  (v) => setProfileData({ ...profileData, rank: v }),
                  ranks
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInput("Mobile Number", profileData.mobileNumber || '+880', (v) => setProfileData({ ...profileData, mobileNumber: v }), "tel", "+880 1...", <Phone className="w-5 h-5" />)}
                {renderSelect(
                  "Preferred Ship Type",
                  profileData.preferredShipType || '',
                  (v) => setProfileData({ ...profileData, preferredShipType: v }),
                  Object.values(ShipType)
                )}
              </div>


              <div className="pt-6 flex gap-4">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setCurrentView(AppView.DASHBOARD)}
                    className="flex-1 py-4 px-6 border border-slate-300 rounded-xl text-lg font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || isOffline}
                  className={`flex-1 flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${!isEditing ? 'w-full' : ''}`}
                >
                  {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Set Sail')}
                  {!loading && !isEditing && <ArrowRight className="ml-2 w-5 h-5" />}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* DOS Import Modal */}
        {showDosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !dosLoading && setShowDosModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">

              <div className="bg-blue-900 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-300" /> DOS Import
                </h3>
                <button onClick={() => setShowDosModal(false)} disabled={dosLoading} className="p-1 hover:bg-blue-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6">
                {dosStep === 'instructions' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Import your CDC information from the Department of Shipping website.
                    </p>

                    <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                        <p className="text-sm text-slate-700">Click the button below to open the DOS website</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                        <p className="text-sm text-slate-700">Enter your CDC Number: <strong>{profileData.cdcNumber}</strong>, Date of Birth: <strong>{profileData.dateOfBirth}</strong>, and solve the CAPTCHA</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                        <p className="text-sm text-slate-700">Click <strong>"Details"</strong> on the results page</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                        <p className="text-sm text-slate-700">Copy the page URL from your browser and paste it here</p>
                      </div>
                    </div>

                    <button
                      onClick={openDosWebsite}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Globe className="w-5 h-5" /> Open DOS Website
                    </button>
                  </div>
                )}

                {dosStep === 'paste_url' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      After you reach the <strong>CDC Details page</strong>, copy the URL from your browser's address bar and paste it below.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Details Page URL</label>
                      <input
                        type="url"
                        value={dosUrl}
                        onChange={(e) => setDosUrl(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://erp.gso.gov.bd/frontend/web/cdc-search/view?id=..."
                      />
                      {dosError && <p className="text-xs text-red-500 mt-2 font-medium flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> {dosError}</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(DOS_WEBSITE_URL, '_blank')}
                        className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all text-sm"
                      >
                        Reopen Website
                      </button>
                      <button
                        onClick={handleDosSubmit}
                        disabled={dosLoading || !dosUrl.trim()}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                      >
                        {dosLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Fetch Data'}
                      </button>
                    </div>
                  </div>
                )}

                {dosStep === 'fetching' && (
                  <div className="py-8 text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                      <Anchor className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Fetching CDC Details...</h4>
                      <p className="text-xs text-slate-500 mt-1">Parsing information from the DOS website</p>
                    </div>
                  </div>
                )}

                {dosStep === 'success' && (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Data Imported!</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        Your CDC information and sea service records have been imported. Check the Sea Service tab!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Application Logic
  if (currentView === AppView.DASHBOARD && currentUser) {
    return (
      <>
        <Dashboard
          user={currentUser}
          onLogout={handleLogout}
          onEditProfile={handleEditProfile}
          onUpdateSeaService={handleUpdateSeaService}
          onToggleJobStatus={handleToggleJobStatus}
          onToggleOnboardStatus={handleToggleOnboardStatus}
        />
        <SessionTracker userId={currentUser.id} initialMinutes={currentUser.profile?.totalUsageMinutes} />
      </>
    );
  }

  return null;
};

export default App;