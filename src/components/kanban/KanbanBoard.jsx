// src/components/kanban/KanbanBoard.jsx
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, closestCenter,
  useSensor, useSensors, PointerSensor
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase }    from '../../lib/supabase';
import { useDarkMode } from '../../store/uiStore';
import KanbanColumn    from './KanbanColumn';
import KanbanCard      from './KanbanCard';
import CardModal       from './CardModal';
import AddJobModal     from './AddJobModal';

const COLUMNS    = ['JOB ORDER','ON PROGRESS','DONE','ON SERVER','CLOSED','BONUS'];
const CLOSED_COLS = ['CLOSED','BONUS'];

export default function KanbanBoard({ jobOrders, showAdd, onAddClose }) {
  const { dark }    = useDarkMode();
  const queryClient = useQueryClient();

  const [activeCard, setActiveCard] = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [addCol,     setAddCol]     = useState(null);

  // ── Local items state untuk drag (snapshot saat drag mulai) ──
  const [localItems, setLocalItems] = useState(null); // null = pakai grouped

  const grouped = useCallback(() =>
    COLUMNS.reduce((acc, col) => {
      acc[col] = [...jobOrders.filter(j => j.column_id === col)]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return acc;
    }, {}),
  [jobOrders]);

  // Sync localItems dari server jika tidak sedang drag
  useEffect(() => {
    if (!activeCard) setLocalItems(null);
  }, [jobOrders, activeCard]); // eslint-disable-line

  const displayItems = localItems ?? grouped();

  // Helper: cari kolom dari card id
  const findCol = (id) => {
    for (const col of COLUMNS) {
      if (displayItems[col]?.some(c => c.id === id)) return col;
    }
    return null;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Mutation: pindah kolom ──
  const moveMut = useMutation({
    mutationFn: async ({ id, column_id, newPosition }) => {
      const updates = { column_id };
      if (column_id === 'BONUS')              updates.has_bonus = true;
      if (column_id !== 'BONUS')              updates.has_bonus = false;
      if (CLOSED_COLS.includes(column_id))    updates.closed_at = new Date().toISOString();
      else                                    updates.closed_at = null;
      if (newPosition !== undefined)          updates.position  = newPosition;
      const { error } = await supabase.from('job_orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, column_id }) => {
      await queryClient.cancelQueries({ queryKey: ['job_orders'] });
      const prev = queryClient.getQueryData(['job_orders']);
      queryClient.setQueryData(['job_orders'], old =>
        old?.map(j => j.id === id ? {
          ...j, column_id,
          has_bonus: column_id === 'BONUS',
          closed_at: CLOSED_COLS.includes(column_id) ? new Date().toISOString() : null,
        } : j) ?? []
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['job_orders'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['job_orders'] }),
  });

  // ── Mutation: simpan urutan (batch update position) ──
  const savePositionsMut = useMutation({
    mutationFn: async (cards) => {
      await Promise.all(
        cards.map((card, i) =>
          supabase.from('job_orders').update({ position: i }).eq('id', card.id)
        )
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['job_orders'] }),
  });

  // ── Drag handlers ──
  const handleDragStart = ({ active }) => {
    const card = jobOrders.find(j => j.id === active.id) ?? null;
    setActiveCard(card);
    // Snapshot state saat ini ke localItems
    setLocalItems(grouped());
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || !localItems) return;

    const activeCol = findCol(active.id);
    // over.id bisa jadi card id atau column id
    const overIsCard = Object.values(localItems).flat().some(c => c.id === over.id);
    const overCol    = overIsCard ? findCol(over.id) : over.id;

    if (!activeCol || !overCol || activeCol === overCol) return;

    // Pindahkan kartu secara visual ke kolom baru saat hover
    setLocalItems(prev => {
      const movingCard = prev[activeCol].find(c => c.id === active.id);
      if (!movingCard) return prev;

      const srcCards  = prev[activeCol].filter(c => c.id !== active.id);
      const dstCards  = [...prev[overCol]];
      const overIdx   = dstCards.findIndex(c => c.id === over.id);
      const insertAt  = overIdx >= 0 ? overIdx : dstCards.length;
      dstCards.splice(insertAt, 0, { ...movingCard, column_id: overCol });

      return { ...prev, [activeCol]: srcCards, [overCol]: dstCards };
    });
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveCard(null);

    if (!over) {
      setLocalItems(null);
      return;
    }

    const srcCol = active.data.current?.column;      // kolom saat drag mulai
    const finalCol = findCol(active.id);             // kolom setelah onDragOver
    const overIsCard = Object.values(displayItems).flat().some(c => c.id === over.id);
    const overCol    = overIsCard ? findCol(over.id) : over.id;

    if (finalCol && finalCol !== srcCol) {
      // ── Cross-column: simpan ke Supabase ──
      const newPos = displayItems[finalCol]?.findIndex(c => c.id === active.id) ?? 0;
      moveMut.mutate({ id: active.id, column_id: finalCol, newPosition: newPos });

    } else if (srcCol && over.id !== active.id) {
      // ── Within-column: reorder ──
      const colCards  = displayItems[srcCol] ?? [];
      const oldIdx    = colCards.findIndex(c => c.id === active.id);
      const newIdx    = colCards.findIndex(c => c.id === over.id);

      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(colCards, oldIdx, newIdx);
        // Update cache optimistically
        queryClient.setQueryData(['job_orders'], (old) =>
          old?.map(j => {
            const idx = reordered.findIndex(r => r.id === j.id);
            return idx !== -1 ? { ...j, position: idx } : j;
          }) ?? []
        );
        savePositionsMut.mutate(reordered);
      }
    }

    setLocalItems(null);
  };

  // Buka Add modal dari toolbar
  if (showAdd && !addCol) setAddCol('JOB ORDER');

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-5 pt-4 pb-8" style={{ alignItems: 'flex-start' }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col}
            column={col}
            cards={displayItems[col] ?? []}
            onCardClick={setSelected}
            onAddCard={() => setAddCol(col)}
            dark={dark}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150 }}>
        {activeCard ? <KanbanCard card={activeCard} isOverlay dark={dark} /> : null}
      </DragOverlay>

      {selected && (
        <CardModal card={selected} onClose={() => setSelected(null)} dark={dark} />
      )}

      {(addCol || showAdd) && (
        <AddJobModal
          defaultColumn={addCol || 'JOB ORDER'}
          onClose={() => { setAddCol(null); onAddClose?.(); }}
          dark={dark}
        />
      )}
    </DndContext>
  );
}
