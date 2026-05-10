// src/pages/KanbanPage.jsx
import { useState, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useJobOrders } from '../hooks/useJobOrders';
import { useDarkMode }  from '../store/uiStore';
import KanbanBoard      from '../components/kanban/KanbanBoard';

const COMPANIES = ['SRI Crane','SRI Repair','SRI Pondasi','Trucking','SEALS','SAI'];

export default function KanbanPage() {
  const { data: jobOrders = [], isLoading } = useJobOrders();
  const { dark }   = useDarkMode();
  const [search,   setSearch]    = useState('');
  const [filterCo, setFilterCo]  = useState('');
  const [filterPri,setFilterPri] = useState('');
  const [showAdd,  setShowAdd]   = useState(false);

  // Kartu CLOSED/BONUS disembunyikan dari kanban setelah 7 hari
  const CLOSED_COLS  = ['CLOSED', 'BONUS'];
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const filtered = useMemo(() => {
    const now = Date.now();

    return jobOrders.filter(j => {
      // Sembunyikan dari kanban jika sudah > 7 hari di CLOSED/BONUS
      if (CLOSED_COLS.includes(j.column_id)) {
        if (j.closed_at) {
          const age = now - new Date(j.closed_at).getTime();
          if (age > SEVEN_DAYS_MS) return false;   // sudah expired → tidak tampil
        }
        // closed_at belum di-set (data lama) → tetap tampilkan dulu
      }

      // Filter search / perusahaan / prioritas
      const q   = search.toLowerCase();
      const ms  = !q || j.title?.toLowerCase().includes(q) || j.description?.toLowerCase().includes(q);
      const mco = !filterCo  || (j.job_order_companies || []).some(c => c.company === filterCo);
      const mpr = !filterPri || j.priority === filterPri;
      return ms && mco && mpr;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobOrders, search, filterCo, filterPri]);

  const inputCls = `px-4 py-2 rounded-xl border text-sm outline-none transition-colors ${dark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500' : 'bg-white border-gray-200 text-gray-700 shadow-sm focus:border-blue-400'}`;

  return (
    <div className="flex flex-col h-[calc(100vh-60px-44px)]">

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-5 pb-0">
        <div className={`flex items-center gap-2 ${inputCls} flex-1 min-w-48`}>
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari job order…"
            className="flex-1 outline-none bg-transparent text-sm"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400"/></button>}
        </div>

        <select value={filterCo} onChange={e => setFilterCo(e.target.value)} className={inputCls}>
          <option value="">Semua Perusahaan</option>
          {COMPANIES.map(c => <option key={c}>{c}</option>)}
        </select>

        <select value={filterPri} onChange={e => setFilterPri(e.target.value)} className={inputCls}>
          <option value="">Semua Prioritas</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm whitespace-nowrap transition-colors"
        >
          <Plus className="w-4 h-4"/>Add Job Order
        </button>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <KanbanBoard jobOrders={filtered} showAdd={showAdd} onAddClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
