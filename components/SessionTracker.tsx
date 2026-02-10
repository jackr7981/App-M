import React, { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface SessionTrackerProps {
    userId: string;
    initialMinutes?: number;
}

export const SessionTracker: React.FC<SessionTrackerProps> = ({ userId, initialMinutes = 0 }) => {
    const currentMinutesRef = useRef(initialMinutes);
    const unsavedMinutesRef = useRef(0);

    useEffect(() => {
        // Timer Logic
        const interval = setInterval(() => {
            // Increment local counters
            currentMinutesRef.current += 1;
            unsavedMinutesRef.current += 1;

            // Save to Supabase every minute
            saveProgress();
        }, 60000); // 1 minute

        const saveProgress = async () => {
            if (unsavedMinutesRef.current > 0) {
                try {
                    // Fetch latest first to be safe (optimistic locking would be better but simple increment is ok)
                    // Actually, we can just update blindly if we trust our local count, OR use rpc if available.
                    // Since we don't have RPC, we read-modify-write or just write blindly?
                    // Writing blindly overwrites other sessions.
                    // Let's read then write.
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('total_usage_minutes')
                        .eq('id', userId)
                        .single();

                    const dbMinutes = profile?.total_usage_minutes || 0;
                    const newTotal = dbMinutes + unsavedMinutesRef.current;

                    const { error } = await supabase
                        .from('profiles')
                        .update({ total_usage_minutes: newTotal })
                        .eq('id', userId);

                    if (!error) {
                        unsavedMinutesRef.current = 0; // Reset unsaved buffer
                        // Update local ref to match DB (roughly)
                        currentMinutesRef.current = newTotal;
                    }
                } catch (err) {
                    console.error("Failed to save session time:", err);
                }
            }
        };

        // Save on unmount/page hide
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveProgress();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            saveProgress(); // Try to save on unmount
        };
    }, [userId]);

    return null; // Invisible component
};
