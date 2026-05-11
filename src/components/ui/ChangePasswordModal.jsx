// src/components/ui/ChangePasswordModal.jsx
import { useState } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ChangePasswordModal({ onClose, dark, onLogout }) {
  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showCon,  setShowCon]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const inputCls = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors pr-10
    ${dark
      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500'
      : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100'
    }`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPass.length < 6) {
      setError('Password baru minimal 6 karakter.'); return;
    }
    if (newPass !== confirm) {
      setError('Konfirmasi password tidak cocok.'); return;
    }

    setLoading(true);
    try {
      // Verifikasi password lama dengan re-sign in
      const { data: { user } } = await supabase.auth.getUser();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email:    user.email,
        password: current,
      });
      if (signErr) { setError('Password saat ini salah.'); setLoading(false); return; }

      // Update password
      const { error: updErr } = await supabase.auth.updateUser({ password: newPass });
      if (updErr) throw updErr;

      setSuccess(true);
      setTimeout(() => { onLogout?.(); }, 2000);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const overlay = dark ? 'bg-black/70' : 'bg-black/40';
  const card    = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const label   = dark ? 'text-gray-300' : 'text-gray-600';
  const title   = dark ? 'text-gray-100' : 'text-gray-800';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlay}`}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full max-w-sm rounded-2xl border shadow-xl ${card}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <h2 className={`font-bold text-base ${title}`}>Ganti Password</h2>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-3 px-5 py-10">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className={`font-semibold ${title}`}>Password berhasil diubah!</p>
            <p className={`text-sm text-center ${label}`}>Anda akan logout otomatis…</p>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">

            {/* Password saat ini */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${label}`}>Password Saat Ini</label>
              <div className="relative">
                <input
                  type={showCur ? 'text' : 'password'}
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  placeholder="Masukkan password lama"
                  className={inputCls}
                  required
                  autoFocus
                />
                <button type="button" onClick={() => setShowCur(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password baru */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${label}`}>Password Baru</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className={inputCls}
                  required
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength indicator */}
              {newPass && (
                <div className="flex gap-1 mt-1.5">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      newPass.length >= i * 3
                        ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                        : dark ? 'bg-gray-700' : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Konfirmasi password */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${label}`}>Konfirmasi Password Baru</label>
              <div className="relative">
                <input
                  type={showCon ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Ulangi password baru"
                  className={`${inputCls} ${confirm && newPass && confirm !== newPass ? (dark ? 'border-red-500' : 'border-red-400') : ''}`}
                  required
                />
                <button type="button" onClick={() => setShowCon(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm && newPass && confirm !== newPass && (
                <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className={`text-sm px-3 py-2 rounded-lg ${dark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                  ${dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !current || !newPass || !confirm}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
