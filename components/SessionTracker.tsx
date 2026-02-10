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
                    const minutesToAdd = unsavedMinutesRef.current;
                    const { error } = await supabase.rpc('increment_usage_minutes', {
                        x: minutesToAdd,
                        user_id: userId
                    });

                    if (!error) {
                        unsavedMinutesRef.current -= minutesToAdd; // Subtract what we successfully added
                        // Optimistically update local ref
                        currentMinutesRef.current += minutesToAdd;
                    } else {
                        console.error("Failed to save session time (RPC error):", error);
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
