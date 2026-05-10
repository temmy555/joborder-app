// src/hooks/useJobOrders.js
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase }  from '../lib/supabase';

// Fetch semua job orders lengkap dengan companies dan assignees
async function fetchJobOrders() {
  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      *,
      job_order_companies ( company ),
      job_order_assignees (
        user_id,
        profiles ( id, full_name, avatar_color, avatar_initials )
      )
    `)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export function useJobOrders() {
  const queryClient = useQueryClient();
  const channelRef  = useRef(null);

  const query = useQuery({
    queryKey: ['job_orders'],
    queryFn:  fetchJobOrders,
    staleTime: 30_000,
  });

  // ── Realtime Subscription ──
  // Pakai ref + unique channel name agar React StrictMode (yang
  // menjalankan effect dua kali di development) tidak crash.
  useEffect(() => {
    // Jika channel sudah ada, jangan buat lagi
    if (channelRef.current) return;

    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['job_orders'] });

    // Buat channel dengan nama unik supaya tidak konflik antar tab/render
    const channelName = `job_orders_rt_${Math.random().toString(36).slice(2)}`;

    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' },         invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_order_companies' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_order_assignees' }, invalidate)
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);

  return query;
}
