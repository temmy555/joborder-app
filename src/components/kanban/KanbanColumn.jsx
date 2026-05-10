// src/components/kanban/KanbanColumn.jsx
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, GripHorizontal } from 'lucide-react';
import KanbanCard from './KanbanCard';

const COL_META = {
  'JOB ORDER':   { dot: 'bg-blue-500',    ring: 'ring-blue-400'    },
  'ON PROGRESS': { dot: 'bg-amber-500',   ring: 'ring-amber-400'   },
  'DONE':        { dot: 'bg-green-500',   ring: 'ring-green-400'   },
  'ON SERVER':   { dot: 'bg-violet-500',  ring: 'ring-violet-400'  },
  'CLOSED':      { dot: 'bg-slate-400',   ring: 'ring-slate-400'   },
  'BONUS':       { dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
};

export default function KanbanColumn({ column, cards, onCardClick, onAddCard, dark }) {
  const { setNodeRef, isOver } = useDroppable({ id: column, data: { column } });

  const m   = COL_META[column] ?? COL_META['JOB ORDER'];
  const bg  = dark ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-gray-200';
  const hdr = dark ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200';
  const cnt = dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500';

  return (
    <div
      className={`flex-shrink-0 w-[17rem] rounded-2xl flex flex-col border overflow-hidden transition-all duration-150
        ${bg} ${isOver ? `ring-2 ${m.ring} ring-offset-1 scale-[1.01]` : ''}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${hdr}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.dot}`} />
          <span className={`text-sm font-bold tracking-wide ${dark ? 'text-gray-100' : 'text-gray-700'}`}>{column}</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${cnt}`}>{cards.length}</span>
        </div>
        <button onClick={onAddCard}
          className={`p-1 rounded-lg transition-colors ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards — SortableContext untuk urutan dalam kolom */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 overflow-y-auto transition-colors duration-150
          ${isOver ? (dark ? 'bg-blue-900/20' : 'bg-blue-50/60') : ''}`}
        style={{ minHeight: 160, maxHeight: 'calc(100vh - 260px)' }}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              column={column}
              onClick={onCardClick}
              dark={dark}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed transition-colors
            ${isOver
              ? (dark ? 'border-blue-500 text-blue-500' : 'border-blue-400 text-blue-400')
              : (dark ? 'border-gray-700 text-gray-700' : 'border-gray-200 text-gray-300')
            }`}
          >
            <GripHorizontal className="w-5 h-5 mb-1" />
            <span className="text-xs">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}
