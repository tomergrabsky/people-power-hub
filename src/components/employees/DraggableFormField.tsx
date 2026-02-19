import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface DraggableFormFieldProps {
  id: string;
  children: ReactNode;
  isDragEnabled: boolean;
}

export function DraggableFormField({ id, children, isDragEnabled }: DraggableFormFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : ''}`}
    >
      {isDragEnabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -right-6 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      {children}
    </div>
  );
}
