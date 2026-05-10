// src/pages/UsersPage.jsx
import { useState }    from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { supabase }    from '../lib/supabase';
import { useDarkMode } from '../store/uiStore';

/* ── Fetch profiles ── */
async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return data;
}

/* ── Avatar ── */
function Avatar({ p, size = 'md' }) {
  const sz = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div
      className={`${sz} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: p.avatar_color || '#3b82f6' }}
      title={p.full_name}
    >
      {p.avatar_initials || p.full_name?.slice(0, 2).toUpperCase() || 'U'}
    </div>
  );
}

/* ── Inline edit row ── */
function EditRow({ profile, onSave, onCancel, dark }) {
  const [form, setForm] = useState({
    full_name:       profile.full_name || '',
    username:        profile.username  || '',
    phone:           profile.phone     || '',
    avatar_color:    profile.avatar_color || '#3b82f6',
    avatar_initials: profile.avatar_initials || '',
  });
  const inp = `px-3 py-1.5 rounded-lg border text-sm outline-none w-full ${dark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-400'}`;
  return (
    <>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <input type="color" value={form.avatar_color} onChange={e => setForm(f => ({...f, avatar_color: e.target.value}))}
            className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
          <input value={form.avatar_initials} onChange={e => setForm(f => ({...f, avatar_initials: e.target.value.slice(0,2).toUpperCase()}))}
            placeholder="AB" maxLength={2} className={`${inp} w-16 text-center font-bold`}/>
          <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
            placeholder="Nama lengkap" className={inp}/>
        </div>
      </td>
      <td className="px-5 py-3 text-sm text-gray-400">{profile.id?.slice(0,8)}…</td>
      <td className="px-5 py-3">
        <input value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} placeholder="username" className={inp}/>
      </td>
      <td className="px-5 py-3">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">Active</span>
      </td>
      <td className="px-5 py-3">
        <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+62..." className={inp}/>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onSave(form)} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
            <Check className="w-4 h-4"/>
          </button>
          <button onClick={onCancel} className={`p-1.5 rounded-lg transition-colors ${dark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <X className="w-4 h-4"/>
          </button>
        </div>
      </td>
    </>
  );
}

export default function UsersPage() {
  const { dark }      = useDarkMode();
  const queryClient   = useQueryClient();
  const [editing, setEditing] = useState(null); // profile id sedang diedit
  const [confirm, setConfirm] = useState(null); // id yang mau dihapus

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn:  fetchProfiles,
  });

  // Update profile
  const updateMut = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('profiles').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setEditing(null);
    },
  });

  // Delete user (hanya hapus profile, bukan auth user)
  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setConfirm(null);
    },
  });

  const thCls = `px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-500'}`;

  if (isLoading) return (
    <div className="p-6 space-y-3 animate-pulse">
      {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200"/>)}
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className={`font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>User Management</h2>
          <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{profiles.length} user terdaftar</p>
        </div>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4"/>
          Tambah User (via Supabase)
        </a>
      </div>

      {/* Table */}
      <div className={`rounded-2xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200 shadow-sm'}`}>
        <table className="w-full">
          <thead className={dark ? 'bg-gray-800' : 'bg-gray-50'}>
            <tr>
              {['User','ID','Username','Status','Telepon','Aksi'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr
                key={p.id}
                className={`border-t transition-colors ${dark ? 'border-gray-700/60 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                {editing === p.id ? (
                  <EditRow
                    profile={p}
                    dark={dark}
                    onSave={(data) => updateMut.mutate({ id: p.id, data })}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar p={p} size="lg"/>
                        <div>
                          <p className={`text-sm font-semibold ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{p.full_name || '—'}</p>
                          <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{p.username ? `@${p.username}` : '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-5 py-4 text-xs font-mono ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {p.id?.slice(0, 8)}…
                    </td>
                    <td className={`px-5 py-4 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {p.username || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    </td>
                    <td className={`px-5 py-4 text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {p.phone || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(p.id)}
                          className={`p-2 rounded-lg transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-600'}`}
                        >
                          <Pencil className="w-4 h-4"/>
                        </button>
                        <button
                          onClick={() => setConfirm(p.id)}
                          className={`p-2 rounded-lg transition-colors ${dark ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {profiles.length === 0 && (
          <p className={`text-sm text-center py-12 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            Belum ada user. Tambahkan lewat Supabase dashboard.
          </p>
        )}

        <div className={`px-5 py-2.5 border-t text-xs ${dark ? 'border-gray-700 text-gray-600' : 'border-gray-100 text-gray-400'}`}>
          Menampilkan {profiles.length} user
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${dark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
            <h3 className={`font-bold text-base mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Hapus User?</h3>
            <p className={`text-sm mb-5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              Data profile akan dihapus. Akun login user tetap ada di Supabase Auth.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`}
              >Batal</button>
              <button
                onClick={() => deleteMut.mutate(confirm)}
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
              >
                {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin"/>}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
