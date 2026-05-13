import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';

export function useProfile(session) {
  const userId = session?.user?.id ?? null;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState('');
  const channelRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, has_paid')
      .eq('id', userId)
      .maybeSingle();
    if (err) {
      setError(err.message);
    } else {
      setProfile(data ?? { id: userId, has_paid: false });
      setError('');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProfile();

    const channel = supabase
      .channel(`profiles:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new) setProfile(payload.new);
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [userId, fetchProfile]);

  return { profile, loading, error, refresh: fetchProfile };
}
