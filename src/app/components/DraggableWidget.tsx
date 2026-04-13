import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { GripVertical, LayoutGrid, RotateCcw, Check, Loader2 } from "lucide-react";

const WIDGET_TYPE = "FLUBN_DASHBOARD_WIDGET";

interface DragItem {
  id: string;
  index: number;
}

// ── DraggableWidget ──────────────────────────────────────────────────────────

interface DraggableWidgetProps {
  id: string;
  index: number;
  label: string;
  onMove: (fromIndex: number, toIndex: number) => void;
  isEditing: boolean;
  children: React.ReactNode;
}

export function DraggableWidget({
  id,
  index,
  label,
  onMove,
  isEditing,
  children,
}: DraggableWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: WIDGET_TYPE,
    item: () => ({ id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => isEditing,
  });

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: WIDGET_TYPE,
    hover(item, monitor) {
      if (!ref.current || !isEditing) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverRect.top;

      // Only swap when cursor has passed the midpoint
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex; // mutate in place to avoid stale ref
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`relative transition-opacity duration-200 ${
        isEditing ? "group/widget" : ""
      }`}
      style={{ opacity: isDragging ? 0.3 : 1 }}
    >
      {/* Drop-target highlight */}
      {isEditing && (
        <div
          className={`absolute inset-0 rounded-xl border-2 pointer-events-none transition-all duration-150 z-10 ${
            isOver
              ? "border-[#2F6BFF] bg-[#2F6BFF]/5"
              : "border-dashed border-[#cbd5e1]"
          }`}
        />
      )}

      {/* Drag handle badge — visible on hover */}
      {isEditing && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-white border border-[#e2e8f0] rounded-full px-2.5 py-1 shadow-sm opacity-0 group-hover/widget:opacity-100 transition-opacity pointer-events-none select-none">
          <GripVertical size={12} className="text-[#94a3b8]" />
          <span className="text-[10px] font-medium text-[#64748b] whitespace-nowrap">
            {label}
          </span>
        </div>
      )}

      {/* Widget content */}
      <div className={isEditing ? "cursor-grab active:cursor-grabbing" : ""}>
        {children}
      </div>
    </div>
  );
}

// ── LayoutCustomizerBar ──────────────────────────────────────────────────────

interface LayoutCustomizerBarProps {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onReset: () => void;
}

export function LayoutCustomizerBar({
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onReset,
}: LayoutCustomizerBarProps) {
  if (!isEditing) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-[#64748b] border border-[#e2e8f0] rounded-xl hover:bg-[#f8f9fc] hover:text-[#1a1a2e] transition-all bg-white shrink-0"
        title="Customize dashboard layout"
      >
        <LayoutGrid size={14} />
        <span className="hidden sm:inline">Customize</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-[#92400e] bg-[#fef3c7] border border-[#fde68a] px-3 py-1.5 rounded-lg select-none">
        <GripVertical size={12} className="text-[#d97706]" />
        <span>Drag widgets to reorder</span>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#64748b] border border-[#e2e8f0] rounded-lg hover:bg-[#f8f9fc] transition-colors bg-white"
        title="Reset to default layout"
      >
        <RotateCcw size={11} />
        Reset
      </button>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-white bg-[#2F6BFF] rounded-lg hover:bg-[#1d4ed8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Check size={11} />
        )}
        {isSaving ? "Saving…" : "Done"}
      </button>
    </div>
  );
}
