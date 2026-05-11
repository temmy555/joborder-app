// src/components/kanban/CardModal.jsx
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Building2, Users, UserRound, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-sky-100 text-sky-700',
};
const COMPANY_BADGE = {
  'SRI Crane':   'bg-blue-100 text-blue-700',
  'SRI Repair':  'bg-purple-100 text-purple-700',
  'SRI Pondasi': 'bg-teal-100 text-teal-700',
  'Trucking':    'bg-amber-100 text-amber-700',
  'SEALS':       'bg-pink-100 text-pink-700',
  'SAI':         'bg-cyan-100 text-cyan-700',
};

const fmtDate = (d) => d ? format(new Date(d), 'd MMMM yyyy', { locale: localeId }) : '—';

export default function CardModal({ card, onClose, dark }) {
  const queryClient = useQueryClient();
  const [progress,       setProgress]       = useState(card.progress ?? 0);
  const [priority,       setPriority]       = useState(card.priority ?? 'medium');
  const [description,    setDescription]    = useState(card.description ?? '');
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const descRef = useRef(null);

  // Auto-resize textarea sesuai isi
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [description]);

  const companies = (card.job_order_companies || []).map(c => c.company);
  const assignees = card.job_order_assignees || [];
  const creator   = card.creator;
  const overdue   = card.due_date && isPast(new Date(card.due_date));

  /* ── Save mutation ── */
  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('job_orders')
        .update({ progress, priority, description })
        .eq('id', card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_orders'] });
      onClose();
    },
  });

  /* ── Delete mutation ── */
  const [deleteError, setDeleteError] = useState('');

  const deleteMut = useMutation({
    mutationFn: async () => {
      setDeleteError('');

      // Hapus relasi dulu
      const { error: e1 } = await supabase
        .from('job_order_companies').delete().eq('job_order_id', card.id);
      if (e1) { console.error('delete companies:', e1); throw e1; }

      const { error: e2 } = await supabase
        .from('job_order_assignees').delete().eq('job_order_id', card.id);
      if (e2) { console.error('delete assignees:', e2); throw e2; }

      const { error: e3 } = await supabase
        .from('job_orders').delete().eq('id', card.id);
      if (e3) { console.error('delete job_order:', e3); throw e3; }
    },
    // Optimistic: langsung hapus dari cache sebelum server reply
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['job_orders'] });
      const prev = queryClient.getQueryData(['job_orders']);
      queryClient.setQueryData(['job_orders'], old =>
        (old ?? []).filter(j => j.id !== card.id)
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      // Rollback jika gagal
      if (ctx?.prev) queryClient.setQueryData(['job_orders'], ctx.prev);
      setDeleteError(err?.message || 'Gagal menghapus. Cek console untuk detail.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_orders'] });
      onClose();
    },
  });

  const bg      = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const divider = dark ? 'border-gray-700' : 'border-gray-100';
  const txt     = dark ? 'text-white' : 'text-gray-900';
  const sub     = dark ? 'text-gray-400' : 'text-gray-500';
  const lbl     = `block text-xs font-bold uppercase tracking-widest mb-2 ${sub}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden ${bg}`}
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeIn .15s ease' }}
      >

        {/* Header */}
        <div className={`px-6 pt-5 pb-4 border-b ${divider}`}>
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${PRIORITY_BADGE[card.priority]}`}>
              {card.priority}
            </span>
            <h2 className={`font-bold text-base flex-1 leading-snug ${txt}`}>{card.title}</h2>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">

          {/* Row 1: Perusahaan + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={lbl}><Building2 className="inline w-3.5 h-3.5 mr-1" />Perusahaan</p>
              <div className="flex flex-wrap gap-1.5">
                {companies.map(c => (
                  <span key={c} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${COMPANY_BADGE[c] || 'bg-gray-100 text-gray-600'}`}>{c}</span>
                ))}
              </div>
            </div>
            <div>
              <p className={lbl}><Calendar className="inline w-3.5 h-3.5 mr-1" />Due Date</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${overdue ? 'text-red-500' : dark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {fmtDate(card.due_date)}
                </span>
                {overdue && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Overdue</span>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Prioritas + Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={lbl}>Prioritas</p>
              <div className="flex gap-1.5">
                {['high','medium','low'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors
                      ${priority === p
                        ? PRIORITY_BADGE[p] + ' ring-2 ring-offset-1'
                        : dark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                  >{p}</button>
                ))}
              </div>
            </div>
            <div>
              <p className={lbl}>Progress — <span className="text-blue-500">{progress}%</span></p>
              <input
                type="range" min={0} max={100} value={progress}
                onChange={e => setProgress(+e.target.value)}
                className="w-full mb-1.5 accent-blue-500"
              />
              <div className={`w-full h-1.5 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Deskripsi — auto-resize */}
          <div>
            <p className={lbl}>Deskripsi</p>
            <textarea
              ref={descRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={1}
              placeholder="Tambahkan deskripsi…"
              className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors resize-none overflow-hidden
                ${dark
                  ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 focus:border-blue-500'
                  : 'bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:bg-white'
                }`}
            />
          </div>

          {/* Row: Assigned To + Dibuat Oleh berdampingan */}
          {(assignees.length > 0 || creator) && (
            <div className="grid grid-cols-2 gap-4">

              {/* Assignees */}
              <div>
                <p className={lbl}><Users className="inline w-3.5 h-3.5 mr-1" />Assigned To</p>
                {assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {assignees.map(a => {
                      const p = a.profiles;
                      if (!p) return null;
                      return (
                        <div key={a.user_id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${dark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                          <div
                            style={{ background: p.avatar_color || '#3b82f6' }}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          >
                            {p.avatar_initials || p.full_name?.slice(0,2).toUpperCase() || 'U'}
                          </div>
                          {p.full_name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                )}
              </div>

              {/* Author */}
              <div>
                <p className={lbl}><UserRound className="inline w-3.5 h-3.5 mr-1" />Dibuat Oleh</p>
                {creator ? (
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl w-fit
                    ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: creator.avatar_color || '#6b7280', fontSize: '10px', fontWeight: 700 }}
                    >
                      {(creator.avatar_initials || creator.full_name?.slice(0,2) || 'U').toUpperCase()}
                    </div>
                    <span className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                      {creator.full_name}
                    </span>
                  </div>
                ) : (
                  <span className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${divider}`}>

          {/* ── Konfirmasi hapus ── */}
          {confirmDelete ? (
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${dark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className={`text-sm flex-1 font-medium ${dark ? 'text-red-300' : 'text-red-700'}`}>
                Hapus job order ini secara permanen?
              </p>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                Batal
              </button>
              <button
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                {deleteMut.isPending
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />
                }
                Hapus
              </button>
            </div>
          ) : (
            /* ── Footer normal ── */
            <div className="flex items-center justify-between gap-2">
              {/* Tombol hapus di kiri */}
              <button
                onClick={() => setConfirmDelete(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors
                  ${dark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>

              {/* Batal + Simpan di kanan */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >Batal</button>
                <button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {saveMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                  Simpan
                </button>
              </div>
            </div>
          )}

          {/* Error delete */}
          {deleteError && (
            <p className="text-xs text-red-500 mt-2 text-center bg-red-50 rounded-lg px-3 py-2">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
