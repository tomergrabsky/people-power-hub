import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableHead } from '@/components/ui/table';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface DraggableTableHeaderProps {
  id: string;
  children: ReactNode;
  isDragEnabled: boolean;
  className?: string;
  onClick?: () => void;
}

export function DraggableTableHeader({ 
  id, 
  children, 
  isDragEnabled, 
  className = '',
  onClick 
}: DraggableTableHeaderProps) {
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
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'z-50 bg-background' : ''} ${isDragEnabled ? 'select-none' : ''}`}
      onClick={isDragEnabled ? undefined : onClick}
    >
      <div className="flex items-center gap-1">
        {isDragEnabled && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-3 w-3" />
          </div>
        )}
        <span className="flex-1">{children}</span>
      </div>
    </TableHead>
  );
}
