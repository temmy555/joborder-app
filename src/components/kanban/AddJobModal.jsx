// src/components/kanban/AddJobModal.jsx
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Search, ChevronDown, UserCircle2 } from 'lucide-react';
import { supabase }   from '../../lib/supabase';
import { useAuth }    from '../../hooks/useAuth';

const COMPANIES = ['SRI Crane','SRI Repair','SRI Pondasi','Trucking','SEALS','SAI'];
const COMPANY_BADGE = {
  'SRI Crane':   'bg-blue-100 text-blue-700',
  'SRI Repair':  'bg-purple-100 text-purple-700',
  'SRI Pondasi': 'bg-teal-100 text-teal-700',
  'Trucking':    'bg-amber-100 text-amber-700',
  'SEALS':       'bg-pink-100 text-pink-700',
  'SAI':         'bg-cyan-100 text-cyan-700',
};
const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-sky-100 text-sky-700',
};
const JOB_TYPES = [
  'Operational Report',
  'Sistem Operational',
  'Financial Report',
  'New Modul',
];

export default function AddJobModal({ defaultColumn, onClose, dark }) {
  const queryClient   = useQueryClient();
  const { user }      = useAuth();
  const assignDropRef = useRef(null);

  const [form, setForm] = useState({
    title: '', due_date: '', description: '',
    priority: 'medium', job_type: '',
    companies: [], assignees: [],   // assignees: array of profile objects
  });

  const [assignSearch,   setAssignSearch]   = useState('');
  const [assignDropOpen, setAssignDropOpen] = useState(false);

  // Fetch semua profiles untuk assign
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_color, avatar_initials')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Tutup dropdown assign saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (assignDropRef.current && !assignDropRef.current.contains(e.target)) {
        setAssignDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const bg      = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const divider = dark ? 'border-gray-700' : 'border-gray-100';
  const txt     = dark ? 'text-white' : 'text-gray-900';
  const sub     = dark ? 'text-gray-400' : 'text-gray-500';
  const lbl     = `block text-xs font-bold uppercase tracking-widest mb-1.5 ${sub}`;
  const inp     = `w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors
    ${dark
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white'
    }`;

  const toggleCompany = (c) => setForm(f => ({
    ...f,
    companies: f.companies.includes(c)
      ? f.companies.filter(x => x !== c)
      : [...f.companies, c],
  }));

  const toggleAssignee = (p) => setForm(f => ({
    ...f,
    assignees: f.assignees.some(a => a.id === p.id)
      ? f.assignees.filter(a => a.id !== p.id)
      : [...f.assignees, p],
  }));

  const isAssigned = (id) => form.assignees.some(a => a.id === id);

  const filteredProfiles = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const addMut = useMutation({
    mutationFn: async () => {
      // 1. Insert job order
      const { data: jo, error: e1 } = await supabase
        .from('job_orders')
        .insert({
          title:       form.title,
          due_date:    form.due_date || null,
          description: form.description,
          priority:    form.priority,
          job_type:    form.job_type || null,
          progress:    0,
          column_id:   defaultColumn,
          created_by:  user?.id ?? null,
        })
        .select()
        .single();
      if (e1) throw e1;

      // 2. Insert companies
      if (form.companies.length > 0) {
        const { error: e2 } = await supabase
          .from('job_order_companies')
          .insert(form.companies.map(company => ({ job_order_id: jo.id, company })));
        if (e2) throw e2;
      }

      // 3. Insert assignees
      if (form.assignees.length > 0) {
        const { error: e3 } = await supabase
          .from('job_order_assignees')
          .insert(form.assignees.map(a => ({ job_order_id: jo.id, user_id: a.id })));
        if (e3) throw e3;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_orders'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || form.companies.length === 0) return;
    addMut.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden ${bg}`}
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeIn .15s ease' }}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${divider}`}>
          <h2 className={`font-bold text-base ${txt}`}>
            Add to <span className="text-blue-500">{defaultColumn}</span>
          </h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className={lbl}>Title *</label>
            <input
              type="text" required
              value={form.title}
              onChange={e => setForm(f => ({...f, title: e.target.value}))}
              placeholder="Masukkan judul job order…"
              className={inp}
            />
          </div>

          {/* Due Date + Job Type — 2 kolom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({...f, due_date: e.target.value}))}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Job Order Type</label>
              <div className="relative">
                <select
                  value={form.job_type}
                  onChange={e => setForm(f => ({...f, job_type: e.target.value}))}
                  className={inp + ' appearance-none pr-10 cursor-pointer'}
                >
                  <option value="">— Pilih Tipe —</option>
                  {JOB_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${sub}`} />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className={lbl}>Prioritas</label>
            <div className="flex gap-2">
              {['high','medium','low'].map(p => (
                <button type="button" key={p} onClick={() => setForm(f => ({...f, priority: p}))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors
                    ${form.priority === p
                      ? PRIORITY_BADGE[p] + ' ring-2 ring-offset-1'
                      : dark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >{p}</button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <label className={lbl}>Perusahaan *</label>
            <div className="flex flex-wrap gap-1.5">
              {COMPANIES.map(c => (
                <button type="button" key={c} onClick={() => toggleCompany(c)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors
                    ${form.companies.includes(c)
                      ? COMPANY_BADGE[c] + ' ring-2 ring-offset-1'
                      : dark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >{c}</button>
              ))}
            </div>
            {form.companies.length === 0 && (
              <p className="text-xs text-red-400 mt-1">Pilih minimal 1 perusahaan</p>
            )}
          </div>

          {/* Assign To */}
          <div ref={assignDropRef}>
            <label className={lbl}>
              <UserCircle2 className="inline w-3.5 h-3.5 mr-1" />
              Assign To
            </label>

            {/* Selected chips */}
            {form.assignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.assignees.map(a => (
                  <span
                    key={a.id}
                    className={`flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full text-xs font-medium
                      ${dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}
                  >
                    <div
                      style={{ background: a.avatar_color || '#3b82f6' }}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    >
                      {a.avatar_initials || a.full_name?.slice(0,1).toUpperCase()}
                    </div>
                    {a.full_name}
                    <button type="button" onClick={() => toggleAssignee(a)} className="hover:text-red-500 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors
                ${dark
                  ? 'bg-gray-700 border-gray-600 focus-within:border-blue-500'
                  : 'bg-gray-50 border-gray-200 focus-within:border-blue-400 focus-within:bg-white'
                }`}
              >
                <Search className={`w-3.5 h-3.5 flex-shrink-0 ${sub}`} />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={e => { setAssignSearch(e.target.value); setAssignDropOpen(true); }}
                  onFocus={() => setAssignDropOpen(true)}
                  placeholder="Cari nama…"
                  className={`flex-1 text-sm outline-none bg-transparent ${dark ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'}`}
                />
              </div>

              {/* Dropdown */}
              {assignDropOpen && filteredProfiles.length > 0 && (
                <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-lg z-10 overflow-hidden max-h-44 overflow-y-auto
                  ${dark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                >
                  {filteredProfiles.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => { toggleAssignee(p); setAssignSearch(''); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left
                        ${isAssigned(p.id)
                          ? dark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'
                          : dark ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div
                        style={{ background: p.avatar_color || '#3b82f6' }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      >
                        {p.avatar_initials || p.full_name?.slice(0,2).toUpperCase() || 'U'}
                      </div>
                      <span className="flex-1">{p.full_name}</span>
                      {isAssigned(p.id) && (
                        <span className="text-xs font-semibold text-blue-500">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {assignDropOpen && filteredProfiles.length === 0 && assignSearch && (
                <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-lg z-10 px-4 py-3 text-sm
                  ${dark ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-white border-gray-200 text-gray-400'}`}
                >
                  Tidak ada user ditemukan
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Deskripsi</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="Deskripsi singkat job order…"
              rows={3}
              className={inp + ' resize-none'}
            />
          </div>

          {addMut.isError && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">
              Gagal menyimpan. Coba lagi.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >Batal</button>
            <button type="submit" disabled={addMut.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors flex items-center justify-center gap-2"
            >
              {addMut.isPending && <Loader2 className="w-4 h-4 animate-spin"/>}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
