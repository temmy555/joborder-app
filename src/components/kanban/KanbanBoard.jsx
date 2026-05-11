// src/components/kanban/KanbanBoard.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
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

  // ── Ref: simpan kolom ASAL saat drag dimulai ──
  // (active.data.current?.column berubah saat card re-render di kolom baru via localItems)
  const dragSrcColRef = useRef(null);

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
    setLocalItems(grouped());
    // ⬇ Simpan kolom ASAL di ref — active.data.current akan berubah saat card re-render
    dragSrcColRef.current = active.data.current?.column ?? null;
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    setLocalItems(prev => {
      const items = prev ?? grouped();

      // Cari kolom card yang sedang di-drag
      let activeCol = null;
      for (const col of COLUMNS) {
        if (items[col]?.some(c => c.id === active.id)) { activeCol = col; break; }
      }

      // Cari kolom tujuan dari over.id (bisa card UUID atau column ID)
      let overCol = null;
      if (COLUMNS.includes(over.id)) {
        overCol = over.id;
      } else {
        for (const col of COLUMNS) {
          if (items[col]?.some(c => c.id === over.id)) { overCol = col; break; }
        }
      }

      if (!activeCol || !overCol || activeCol === overCol) return items;

      // Pindahkan card secara visual
      const movingCard = items[activeCol].find(c => c.id === active.id);
      if (!movingCard) return items;

      const srcCards = items[activeCol].filter(c => c.id !== active.id);
      const dstCards = [...(items[overCol] ?? [])];
      const overIdx  = dstCards.findIndex(c => c.id === over.id);
      const insertAt = overIdx >= 0 ? overIdx : dstCards.length;
      dstCards.splice(insertAt, 0, { ...movingCard, column_id: overCol });

      return { ...items, [activeCol]: srcCards, [overCol]: dstCards };
    });
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveCard(null);

    if (!over) { setLocalItems(null); return; }

    // ⬇ Pakai ref untuk kolom asal (bukan active.data.current yang sudah berubah)
    const srcCol = dragSrcColRef.current;

    // Tentukan kolom tujuan dari over.id
    let targetCol = null;
    if (COLUMNS.includes(over.id)) {
      targetCol = over.id;
    } else {
      for (const col of COLUMNS) {
        if (displayItems[col]?.some(c => c.id === over.id)) { targetCol = col; break; }
      }
    }

    if (!srcCol || !targetCol) { setLocalItems(null); return; }

    if (targetCol !== srcCol) {
      // ── Cross-column: simpan ke Supabase ──
      moveMut.mutate({ id: active.id, column_id: targetCol });

    } else if (over.id !== active.id) {
      // ── Within-column: reorder ──
      const colCards = displayItems[srcCol] ?? [];
      const oldIdx   = colCards.findIndex(c => c.id === active.id);
      const newIdx   = colCards.findIndex(c => c.id === over.id);

      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(colCards, oldIdx, newIdx);
        queryClient.setQueryData(['job_orders'], old =>
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
