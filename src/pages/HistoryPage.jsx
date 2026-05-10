// src/pages/HistoryPage.jsx
// Menampilkan semua job order yang sudah CLOSED atau DONE sebagai history
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useJobOrders } from '../hooks/useJobOrders';
import { useDarkMode }  from '../store/uiStore';

const COMPANY_BADGE = {
  'SRI Crane':   'bg-blue-100 text-blue-700',
  'SRI Repair':  'bg-purple-100 text-purple-700',
  'SRI Pondasi': 'bg-teal-100 text-teal-700',
  'Trucking':    'bg-amber-100 text-amber-700',
  'SEALS':       'bg-pink-100 text-pink-700',
  'SAI':         'bg-cyan-100 text-cyan-700',
};

const fmtDate = (d) => d ? format(new Date(d), 'd MMM yyyy', { locale: localeId }) : '—';

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp className="w-3.5 h-3.5 opacity-20" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3.5 h-3.5 text-blue-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
}

export default function HistoryPage() {
  const { data: jobOrders = [], isLoading } = useJobOrders();
  const { dark } = useDarkMode();

  const [search,    setSearch]    = useState('');
  const [filterCol, setFilterCol] = useState('');  // '' = all closed/done
  const [filterBon, setFilterBon] = useState('');  // '' | 'true' | 'false'
  const [sortField, setSortField] = useState('updated_at');
  const [sortDir,   setSortDir]   = useState('desc');
  const [page,      setPage]      = useState(1);
  const PER_PAGE = 15;

  // Hanya tampilkan CLOSED dan BONUS
  const historyRows = useMemo(() => {
    let rows = jobOrders.filter(j => ['CLOSED','BONUS'].includes(j.column_id));

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        (j.job_order_companies || []).some(c => c.company.toLowerCase().includes(q))
      );
    }
    if (filterCol) rows = rows.filter(j => j.column_id === filterCol);
    if (filterBon) rows = rows.filter(j => String(j.has_bonus) === filterBon);

    rows = [...rows].sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    return rows;
  }, [jobOrders, search, filterCol, filterBon, sortField, sortDir]);

  const totalPages = Math.ceil(historyRows.length / PER_PAGE);
  const pageRows   = historyRows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  // styles
  const inputCls = `px-4 py-2 rounded-xl border text-sm outline-none transition-colors ${dark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500' : 'bg-white border-gray-200 text-gray-700 shadow-sm focus:border-blue-400'}`;
  const thCls    = `px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer select-none ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`;

  if (isLoading) return (
    <div className="p-6 space-y-3 animate-pulse">
      {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl bg-gray-200" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className={`flex items-center gap-2 ${inputCls} flex-1 min-w-52`}>
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari title, deskripsi, atau perusahaan…"
            className="flex-1 text-sm outline-none bg-transparent"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}>
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <select
          value={filterCol}
          onChange={e => { setFilterCol(e.target.value); setPage(1); }}
          className={inputCls}
        >
          <option value="">Semua Status</option>
          <option value="CLOSED">Closed</option>
          <option value="BONUS">Bonus</option>
        </select>

        <select
          value={filterBon}
          onChange={e => { setFilterBon(e.target.value); setPage(1); }}
          className={inputCls}
        >
          <option value="">Semua Bonus</option>
          <option value="true">Bonus: YES</option>
          <option value="false">Bonus: NO</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className={`rounded-2xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className={dark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={thCls} onClick={() => handleSort('job_type')}>
                  <span className="flex items-center gap-1">Job Type <SortIcon field="job_type" sortField={sortField} sortDir={sortDir}/></span>
                </th>
                <th className={thCls} onClick={() => handleSort('title')}>
                  <span className="flex items-center gap-1">Title <SortIcon field="title" sortField={sortField} sortDir={sortDir}/></span>
                </th>
                <th className={thCls}>Perusahaan</th>
                <th className={thCls}>Deskripsi</th>
                <th className={thCls} onClick={() => handleSort('due_date')}>
                  <span className="flex items-center gap-1">Due Date <SortIcon field="due_date" sortField={sortField} sortDir={sortDir}/></span>
                </th>
                <th className={thCls} onClick={() => handleSort('column_id')}>
                  <span className="flex items-center gap-1">Status <SortIcon field="column_id" sortField={sortField} sortDir={sortDir}/></span>
                </th>
                <th className={thCls} onClick={() => handleSort('has_bonus')}>
                  <span className="flex items-center gap-1">Bonus <SortIcon field="has_bonus" sortField={sortField} sortDir={sortDir}/></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(row => {
                const companies = (row.job_order_companies || []).map(c => c.company);
                return (
                  <tr
                    key={row.id}
                    className={`border-t transition-colors ${dark ? 'border-gray-700/60 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${dark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        {row.job_type || 'operational'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold text-sm ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {row.title}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {companies.slice(0, 2).map(c => (
                          <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-medium ${COMPANY_BADGE[c] || 'bg-gray-100 text-gray-600'}`}>{c}</span>
                        ))}
                        {companies.length > 2 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>+{companies.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm max-w-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p className="truncate max-w-xs">{row.description || '—'}</p>
                    </td>
                    <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {fmtDate(row.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        row.column_id === 'BONUS'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.column_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${row.has_bonus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {row.has_bonus ? 'YES' : 'NO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <p className={`text-sm text-center py-12 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              Tidak ada data yang cocok
            </p>
          )}
        </div>

        {/* Pagination + info */}
        <div className={`px-4 py-3 border-t flex items-center justify-between flex-wrap gap-2 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
          <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            Menampilkan {Math.min((page - 1) * PER_PAGE + 1, historyRows.length)}–{Math.min(page * PER_PAGE, historyRows.length)} dari {historyRows.length} entri
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-7 rounded-lg text-xs font-medium transition-colors ${n === page ? 'bg-blue-600 text-white' : dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >{n}</button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
