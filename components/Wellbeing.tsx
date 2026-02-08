import React, { useState, useEffect } from 'react';
import { MoodEntry, MoodType } from '../types';
import { Heart, Activity, Battery, Phone, Wind, Brain, Smile, Meh, Frown, Zap, Coffee, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const MOODS: { type: MoodType; icon: any; color: string; label: string }[] = [
    { type: 'Great', icon: Zap, color: 'text-yellow-500 bg-yellow-100', label: 'Great' },
    { type: 'Good', icon: Smile, color: 'text-green-500 bg-green-100', label: 'Good' },
    { type: 'Okay', icon: Meh, color: 'text-blue-500 bg-blue-100', label: 'Okay' },
    { type: 'Stressed', icon: Frown, color: 'text-orange-500 bg-orange-100', label: 'Stressed' },
    { type: 'Exhausted', icon: Battery, color: 'text-red-500 bg-red-100', label: 'Exhausted' },
];

export const Wellbeing: React.FC = () => {
    const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
    const [todaysMood, setTodaysMood] = useState<MoodType | null>(null);
    const [restHours, setRestHours] = useState<string>('');
    const [fatigueStatus, setFatigueStatus] = useState<'Safe' | 'Caution' | 'Danger' | null>(null);
    const [isBreathingActive, setIsBreathingActive] = useState(false);
    const [breathingStep, setBreathingStep] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Hold'>('Inhale');

    // Load Mock History
    useEffect(() => {
        const history: MoodEntry[] = [
            { id: '1', timestamp: Date.now() - 86400000 * 2, mood: 'Good' },
            { id: '2', timestamp: Date.now() - 86400000, mood: 'Stressed' },
        ];
        setMoodHistory(history);
    }, []);

    // Breathing Animation Loop
    useEffect(() => {
        let interval: any;
        if (isBreathingActive) {
            let stepIndex = 0;
            const steps: ('Inhale' | 'Hold' | 'Exhale' | 'Hold')[] = ['Inhale', 'Hold', 'Exhale', 'Hold'];
            
            // Initial Step
            setBreathingStep(steps[0]);

            interval = setInterval(() => {
                stepIndex = (stepIndex + 1) % 4;
                setBreathingStep(steps[stepIndex]);
            }, 4000); // 4 seconds per step
        }
        return () => clearInterval(interval);
    }, [isBreathingActive]);

    const handleMoodSelect = (mood: MoodType) => {
        setTodaysMood(mood);
        setMoodHistory(prev => [...prev, { id: Date.now().toString(), timestamp: Date.now(), mood }]);
    };

    const calculateFatigue = () => {
        const hours = parseFloat(restHours);
        if (isNaN(hours)) return;

        if (hours < 10) setFatigueStatus('Danger');
        else if (hours < 12) setFatigueStatus('Caution');
        else setFatigueStatus('Safe');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Heart className="w-6 h-6 text-rose-300 fill-rose-300" /> Sea Mind
                    </h2>
                    <p className="text-emerald-50 mt-1 opacity-90">Mental Health & Wellbeing Support</p>
                </div>
                <Brain className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
            </div>

            {/* Daily Check-in */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" /> How are you feeling today?
                </h3>
                
                {todaysMood ? (
                    <div className="text-center py-4 animate-in zoom-in">
                        <div className="inline-flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${MOODS.find(m => m.type === todaysMood)?.color}`}>
                                {React.createElement(MOODS.find(m => m.type === todaysMood)?.icon || Smile, { className: "w-8 h-8" })}
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg">Logged as "{todaysMood}"</h4>
                            <p className="text-slate-500 text-sm mt-1">
                                {todaysMood === 'Exhausted' || todaysMood === 'Stressed' 
                                    ? "Take a moment to breathe or talk to someone." 
                                    : "Glad to hear that! Keep it up."}
                            </p>
                            <button onClick={() => setTodaysMood(null)} className="mt-4 text-sm text-blue-600 hover:underline">Edit Entry</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-2">
                        {MOODS.map((m) => (
                            <button 
                                key={m.type}
                                onClick={() => handleMoodSelect(m.type)}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-active:scale-95 ${m.color} bg-opacity-50 border-2 border-transparent hover:border-slate-200`}>
                                    <m.icon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-medium text-slate-500">{m.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Fatigue Tracker */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-2 flex items-center">
                        <Battery className="w-5 h-5 mr-2 text-orange-500" /> Fatigue Check
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Based on STCW rest hours (Min 10h in 24h)</p>

                    <div className="flex gap-2 items-center mb-4">
                        <input 
                            type="number" 
                            placeholder="Hours rested (last 24h)" 
                            value={restHours}
                            onChange={(e) => {
                                setRestHours(e.target.value);
                                setFatigueStatus(null);
                            }}
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                        />
                        <button 
                            onClick={calculateFatigue}
                            className="bg-slate-800 text-white p-3 rounded-xl font-bold hover:bg-slate-700"
                        >
                            Check
                        </button>
                    </div>

                    {fatigueStatus && (
                        <div className={`p-4 rounded-xl border-l-4 animate-in slide-in-from-top-2 ${
                            fatigueStatus === 'Safe' ? 'bg-green-50 border-green-500' : 
                            fatigueStatus === 'Caution' ? 'bg-amber-50 border-amber-500' : 'bg-red-50 border-red-500'
                        }`}>
                            <div className="flex items-center gap-3">
                                {fatigueStatus === 'Safe' && <CheckCircle className="w-6 h-6 text-green-600" />}
                                {fatigueStatus === 'Caution' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                {fatigueStatus === 'Danger' && <XCircle className="w-6 h-6 text-red-600" />}
                                
                                <div>
                                    <h4 className={`font-bold ${
                                        fatigueStatus === 'Safe' ? 'text-green-800' : 
                                        fatigueStatus === 'Caution' ? 'text-amber-800' : 'text-red-800'
                                    }`}>
                                        {fatigueStatus === 'Safe' ? 'Compliant' : fatigueStatus === 'Caution' ? 'Caution' : 'High Fatigue Risk'}
                                    </h4>
                                    <p className="text-xs opacity-80 mt-1">
                                        {fatigueStatus === 'Safe' ? 'You are well rested.' : 
                                         fatigueStatus === 'Caution' ? 'Monitor your alertness.' : 'Stop work immediately if unsafe.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mind Gym - Box Breathing */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                    <h3 className="font-bold text-slate-700 mb-2 flex items-center self-start w-full justify-between">
                        <span className="flex items-center"><Wind className="w-5 h-5 mr-2 text-sky-500" /> Mind Gym</span>
                        {!isBreathingActive && <span className="text-xs bg-sky-100 text-sky-600 px-2 py-1 rounded">Box Breathing</span>}
                    </h3>

                    {isBreathingActive ? (
                        <div className="py-8 flex flex-col items-center">
                             <div className={`w-32 h-32 rounded-full border-4 border-sky-200 flex items-center justify-center transition-all duration-[4000ms] relative ${
                                breathingStep === 'Inhale' ? 'scale-125 bg-sky-50' : 
                                breathingStep === 'Exhale' ? 'scale-75 bg-transparent' : 'scale-100'
                             }`}>
                                 <div className="text-xl font-bold text-sky-600">{breathingStep}</div>
                                 <div className="absolute inset-0 rounded-full border-t-4 border-sky-500 animate-spin" style={{animationDuration: '4s'}}></div>
                             </div>
                             <button onClick={() => setIsBreathingActive(false)} className="mt-6 text-xs text-slate-400 hover:text-slate-600">Stop Exercise</button>
                        </div>
                    ) : (
                        <div className="py-4 text-center">
                            <p className="text-sm text-slate-500 mb-4">Feeling anxious? Use the 4-4-4-4 box breathing technique to reset your nervous system.</p>
                            <button 
                                onClick={() => setIsBreathingActive(true)}
                                className="px-6 py-2 bg-sky-500 text-white rounded-full font-bold shadow-md hover:bg-sky-600 transition-transform active:scale-95"
                            >
                                Start Breathing
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Quick Tips & Helplines */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                 <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                    <Phone className="w-5 h-5 mr-2 text-rose-500" /> Helplines & Support
                </h3>
                
                <div className="space-y-3">
                    <a href="https://www.seafarerhelp.org/" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">⚓️</div>
                            <div>
                                <h4 className="font-bold text-slate-800">ISWAN SeafarerHelp</h4>
                                <p className="text-xs text-slate-500">Free, confidential, 24/7</p>
                            </div>
                        </div>
                        <Info className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                    </a>
                    
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 text-sm mb-2">Grounding Technique (5-4-3-2-1)</h4>
                        <ul className="text-xs text-blue-800 space-y-1">
                            <li>👀 <span className="font-semibold">5</span> things you can see</li>
                            <li>✋ <span className="font-semibold">4</span> things you can feel</li>
                            <li>👂 <span className="font-semibold">3</span> things you can hear</li>
                            <li>👃 <span className="font-semibold">2</span> things you can smell</li>
                            <li>👅 <span className="font-semibold">1</span> thing you can taste</li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    );
};