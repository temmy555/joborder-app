// src/pages/DashboardPage.jsx
import { useMemo }      from 'react';
import { format, isPast, differenceInDays } from 'date-fns';
import { id as localeId }                   from 'date-fns/locale';
import {
  TrendingUp, CheckCircle, AlertTriangle,
  Calendar, Building2, Users
} from 'lucide-react';
import { useJobOrders } from '../hooks/useJobOrders';
import { useDarkMode }  from '../store/uiStore';

/* ── helpers ── */
const COLUMNS      = ['JOB ORDER','ON PROGRESS','DONE','ON SERVER','CLOSED','BONUS'];
const ACTIVE_COLS  = ['JOB ORDER','ON PROGRESS','ON SERVER'];
const COMPANIES    = ['SRI Crane','SRI Repair','SRI Pondasi','Trucking','SEALS','SAI'];

const isOverdue = (d) => d && isPast(new Date(d));
const isDueSoon = (d) => { if (!d) return false; const diff = differenceInDays(new Date(d), new Date()); return diff >= 0 && diff <= 7; };

const fmtDate = (d) => d ? format(new Date(d), 'd MMM yyyy', { locale: localeId }) : '—';

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

const COL_COLOR = {
  'JOB ORDER':   'bg-blue-500',
  'ON PROGRESS': 'bg-amber-500',
  'DONE':        'bg-green-500',
  'ON SERVER':   'bg-violet-500',
  'CLOSED':      'bg-slate-400',
  'BONUS':       'bg-emerald-500',
};

/* ── sub-components ── */
function StatCard({ label, value, sub, gradient, Icon }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-80 mb-1">{label}</p>
          <p className="text-4xl font-black">{value}</p>
          <p className="text-xs opacity-60 mt-1">{sub}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function AvatarStack({ assignees }) {
  return (
    <div className="flex -space-x-1.5">
      {assignees.slice(0, 3).map((a) => {
        const p = a.profiles;
        if (!p) return null;
        return (
          <div
            key={a.user_id}
            title={p.full_name}
            style={{ background: p.avatar_color || '#3b82f6' }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white"
          >
            {p.avatar_initials || p.full_name?.slice(0,2).toUpperCase() || 'U'}
          </div>
        );
      })}
      {assignees.length > 3 && (
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 ring-2 ring-white">
          +{assignees.length - 3}
        </div>
      )}
    </div>
  );
}

/* ── main ── */
export default function DashboardPage() {
  const { data: jobOrders = [], isLoading } = useJobOrders();
  const { dark } = useDarkMode();

  const stats = useMemo(() => {
    const onProgress = jobOrders.filter(j => ACTIVE_COLS.includes(j.column_id)).length;
    const finished   = jobOrders.filter(j => ['DONE','ON SERVER','CLOSED','BONUS'].includes(j.column_id)).length;
    const overdue    = jobOrders.filter(j => ACTIVE_COLS.includes(j.column_id) && isOverdue(j.due_date)).length;
    return { onProgress, finished, overdue };
  }, [jobOrders]);

  // Distribusi per kolom
  const distData = useMemo(() =>
    COLUMNS.map(col => ({ col, cnt: jobOrders.filter(j => j.column_id === col).length })),
  [jobOrders]);
  const maxCnt = Math.max(...distData.map(d => d.cnt), 1);

  // Distribusi per company
  const companyDist = useMemo(() => {
    const dist = {};
    COMPANIES.forEach(c => { dist[c] = 0; });
    jobOrders.forEach(j => {
      (j.job_order_companies || []).forEach(({ company }) => {
        if (company in dist) dist[company]++;
      });
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [jobOrders]);

  // Active projects
  const activeCards = useMemo(() =>
    jobOrders.filter(j => ACTIVE_COLS.includes(j.column_id))
             .sort((a, b) => (isOverdue(a.due_date) ? -1 : 1)),
  [jobOrders]);

  const card = `rounded-2xl ${dark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-sm'}`;
  const txt  = dark ? 'text-white' : 'text-gray-900';
  const sub  = dark ? 'text-gray-400' : 'text-gray-500';

  if (isLoading) return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-200" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="On Progress" value={stats.onProgress} sub="Active projects"    gradient="from-blue-500 to-blue-600"      Icon={TrendingUp}    />
        <StatCard label="Finished"    value={stats.finished}   sub="Completed all time" gradient="from-emerald-500 to-green-600"  Icon={CheckCircle}   />
        <StatCard label="Overdue"     value={stats.overdue}    sub="Need attention"     gradient="from-red-500 to-rose-600"       Icon={AlertTriangle} />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar chart: distribusi per kolom */}
        <div className={`lg:col-span-2 p-6 ${card}`}>
          <h3 className={`font-bold text-sm mb-5 flex items-center gap-2 ${txt}`}>
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Distribusi Project per Status
          </h3>
          <div className="space-y-3">
            {distData.map(({ col, cnt }) => (
              <div key={col} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-28 flex-shrink-0 ${sub}`}>{col}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className={`flex-1 rounded-full h-6 overflow-hidden ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div
                      className={`h-full rounded-full ${COL_COLOR[col]} transition-all duration-700 flex items-center justify-end pr-2`}
                      style={{ width: `${cnt ? Math.max((cnt / maxCnt) * 100, 8) : 0}%` }}
                    >
                      {cnt > 0 && <span className="text-white text-xs font-bold">{cnt}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company distribution */}
        <div className={`p-6 ${card}`}>
          <h3 className={`font-bold text-sm mb-5 flex items-center gap-2 ${txt}`}>
            <Building2 className="w-4 h-4 text-blue-500" />
            Per Perusahaan
          </h3>
          <div className="space-y-3">
            {companyDist.map(([company, cnt]) => (
              <div key={company} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${COMPANY_BADGE[company] || 'bg-gray-100 text-gray-600'}`}>
                  {company}
                </span>
                <span className={`text-sm font-bold ${txt}`}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Projects ── */}
      <div className={`p-6 ${card}`}>
        <h3 className={`font-bold text-sm mb-4 flex items-center gap-2 ${txt}`}>
          <Users className="w-4 h-4 text-blue-500" />
          Active Projects
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
            {activeCards.length}
          </span>
        </h3>

        {activeCards.length === 0 && (
          <p className={`text-sm text-center py-8 ${sub}`}>Tidak ada project aktif</p>
        )}

        <div className="space-y-1">
          {activeCards.map(card => {
            const od = isOverdue(card.due_date);
            const ds = isDueSoon(card.due_date);
            const companies  = (card.job_order_companies || []).map(c => c.company);
            const assignees  = card.job_order_assignees || [];

            return (
              <div
                key={card.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${dark ? 'hover:bg-gray-700/60' : 'hover:bg-gray-50'}`}
              >
                {/* Dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${od ? 'bg-red-500' : 'bg-blue-500'}`} />

                {/* Title + companies */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {card.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {companies.slice(0, 2).map(c => (
                      <span key={c} className={`text-xs px-1.5 py-0.5 rounded font-medium ${COMPANY_BADGE[c] || 'bg-gray-100 text-gray-600'}`}>{c}</span>
                    ))}
                    {companies.length > 2 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>+{companies.length - 2}</span>
                    )}
                  </div>
                </div>

                {/* Progress + due date */}
                <div className="w-36 hidden sm:block">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={sub}>{card.progress ?? 0}%</span>
                    <span className={od ? 'text-red-500 font-medium' : ds ? 'text-amber-500 font-medium' : sub}>
                      {fmtDate(card.due_date)}
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full ${od ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${card.progress ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Priority */}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full hidden md:inline ${PRIORITY_BADGE[card.priority] || ''}`}>
                  {card.priority}
                </span>

                {/* Assignees */}
                <AvatarStack assignees={assignees} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Due Soon Warning ── */}
      {(() => {
        const dueSoon = jobOrders.filter(j => ACTIVE_COLS.includes(j.column_id) && isDueSoon(j.due_date) && !isOverdue(j.due_date));
        if (!dueSoon.length) return null;
        return (
          <div className={`p-5 rounded-2xl border ${dark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
            <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${dark ? 'text-amber-300' : 'text-amber-800'}`}>
              <Calendar className="w-4 h-4" />
              Deadline dalam 7 hari ke depan ({dueSoon.length} project)
            </h3>
            <div className="flex flex-wrap gap-2">
              {dueSoon.map(j => (
                <span key={j.id} className={`text-xs px-3 py-1.5 rounded-full font-medium ${dark ? 'bg-amber-800/40 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
                  {j.title} — {fmtDate(j.due_date)}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
