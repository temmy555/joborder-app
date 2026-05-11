// src/components/kanban/KanbanCard.jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS }         from '@dnd-kit/utilities';
import { format, isPast } from 'date-fns';
import { id as localeId }  from 'date-fns/locale';
import { Calendar, GripVertical, UserRound, Users2 } from 'lucide-react';

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

const JOB_TYPE_STYLE = {
  'Operational Report': { bg: 'from-blue-700 to-blue-900',       text: 'text-white', sub: 'text-blue-200'    },
  'Sistem Operational': { bg: 'from-violet-700 to-violet-900',   text: 'text-white', sub: 'text-violet-200'  },
  'Financial Report':   { bg: 'from-emerald-600 to-emerald-900', text: 'text-white', sub: 'text-emerald-200' },
  'New Modul':          { bg: 'from-slate-600 to-slate-900',     text: 'text-white', sub: 'text-slate-300'   },
};

function JobTypeBanner({ jobType }) {
  if (!jobType) return null;
  const style = JOB_TYPE_STYLE[jobType] ?? { bg: 'from-gray-600 to-gray-900', text: 'text-white', sub: 'text-gray-300' };
  const words = jobType.toUpperCase().split(' ');
  const lines = words.length <= 2 ? [words.join(' ')] : [
    words.slice(0, Math.ceil(words.length / 2)).join(' '),
    words.slice(Math.ceil(words.length / 2)).join(' '),
  ];
  return (
    <div className={`relative w-full h-24 rounded-xl mb-3 bg-gradient-to-br ${style.bg} flex flex-col items-center justify-center overflow-hidden select-none`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative text-center px-3">
        {lines.map((line, i) => (
          <p key={i} className={`font-black leading-none tracking-tight ${style.text}`}
            style={{ fontSize: lines[0].length > 12 ? '0.85rem' : lines[0].length > 8 ? '1rem' : '1.15rem', fontStyle: 'italic', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            {line}
          </p>
        ))}
        <p className={`text-xs mt-1 tracking-widest font-semibold opacity-70 ${style.sub}`}
          style={{ fontSize: '0.55rem', letterSpacing: '0.25em' }}>
          WONOKITRI
        </p>
      </div>
    </div>
  );
}

function AvatarMini({ p }) {
  return (
    <div style={{ background: p?.avatar_color || '#3b82f6' }}
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white flex-shrink-0"
      title={p?.full_name}>
      {p?.avatar_initials || p?.full_name?.slice(0,2).toUpperCase() || 'U'}
    </div>
  );
}

export default function KanbanCard({ card, column, onClick, dark, isOverlay }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({
    id:   card.id,
    data: { column },
  });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  const companies = (card.job_order_companies || []).map(c => c.company);
  const assignees = card.job_order_assignees || [];
  const creator   = card.creator;   // profile object dari JOIN created_by
  const overdue   = card.due_date && isPast(new Date(card.due_date));
  const fmtDate   = card.due_date ? format(new Date(card.due_date), 'd MMM yyyy', { locale: localeId }) : null;

  // Ambil first name saja agar ringkas
  const firstName = (fullName) => fullName?.split(' ')[0] ?? fullName ?? '—';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick?.(card)}
      className={`group rounded-xl p-3.5 mb-2.5 border select-none cursor-grab active:cursor-grabbing
        transition-shadow duration-150
        ${dark
          ? 'bg-gray-800 border-gray-700 hover:border-blue-500/60 shadow-lg shadow-black/20'
          : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md'
        }
        ${isDragging ? 'opacity-30 shadow-none' : ''}
        ${isOverlay  ? 'shadow-2xl rotate-1 scale-105 cursor-grabbing' : ''}
      `}
    >
      <JobTypeBanner jobType={card.job_type} />

      {/* Priority + drag indicator */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[card.priority] || ''}`}>
          {card.priority}
        </span>
        <div className={`p-1 rounded transition-opacity opacity-30 group-hover:opacity-70 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      <h4 className={`font-semibold text-sm leading-snug mb-2.5 ${dark ? 'text-gray-100' : 'text-gray-800'}`}>
        {card.title}
      </h4>

      <div className="flex flex-wrap gap-1 mb-3">
        {companies.slice(0, 2).map(c => (
          <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-medium ${COMPANY_BADGE[c] || 'bg-gray-100 text-gray-600'}`}>{c}</span>
        ))}
        {companies.length > 2 && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>+{companies.length - 2}</span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Progress</span>
          <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{card.progress ?? 0}%</span>
        </div>
        <div className={`w-full h-1.5 rounded-full ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div className={`h-full rounded-full transition-all ${card.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${card.progress ?? 0}%` }} />
        </div>
      </div>

      {/* Due date */}
      {fmtDate && (
        <div className={`flex items-center gap-1 text-xs mb-2.5 ${overdue ? 'text-red-500 font-semibold' : dark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Calendar className="w-3 h-3 flex-shrink-0"/>
          <span>{fmtDate}</span>
          {overdue && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${dark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'}`}>overdue</span>}
        </div>
      )}

      {/* Divider */}
      <div className={`border-t mb-2 ${dark ? 'border-gray-700' : 'border-gray-100'}`} />

      {/* Creator */}
      {creator && (
        <div className={`flex items-center gap-1.5 mb-1.5`}>
          <UserRound className={`w-3 h-3 flex-shrink-0 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Dibuat:</span>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ background: creator.avatar_color || '#6b7280', fontSize: '8px', fontWeight: 700 }}
            >
              {(creator.avatar_initials || creator.full_name?.slice(0,2) || 'U').toUpperCase()}
            </div>
            <span className={`text-xs font-medium truncate max-w-[90px] ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
              {firstName(creator.full_name)}
            </span>
          </div>
        </div>
      )}

      {/* Assignees */}
      {assignees.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Users2 className={`w-3 h-3 flex-shrink-0 mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs flex-shrink-0 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Assign:</span>
          <div className="flex flex-wrap gap-1">
            {assignees.slice(0, 3).map(a => (
              <span
                key={a.user_id}
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1
                  ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center text-white"
                  style={{ background: a.profiles?.avatar_color || '#3b82f6', fontSize: '7px', fontWeight: 700 }}
                >
                  {(a.profiles?.avatar_initials || a.profiles?.full_name?.slice(0,1) || 'U').toUpperCase()}
                </div>
                {firstName(a.profiles?.full_name)}
              </span>
            ))}
            {assignees.length > 3 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                +{assignees.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
