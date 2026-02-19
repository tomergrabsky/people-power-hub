import { ReactNode, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableFormField } from './DraggableFormField';
import { Button } from '@/components/ui/button';
import { RotateCcw, Move } from 'lucide-react';

interface FormFieldConfig {
  id: string;
  label: string;
  component: ReactNode;
  isManagerOnly?: boolean;
  isSuperAdminOnly?: boolean;
}

interface DraggableFormContainerProps {
  fields: FormFieldConfig[];
  fieldOrder: string[];
  onOrderChange: (newOrder: string[]) => void;
  onReset: () => void;
  isDragMode: boolean;
  onToggleDragMode: () => void;
  isManager: boolean;
  isSuperAdmin?: boolean;
  disabled?: boolean;
}

export function DraggableFormContainer({
  fields,
  fieldOrder,
  onOrderChange,
  onReset,
  isDragMode,
  onToggleDragMode,
  isManager,
  isSuperAdmin = false,
  disabled = false,
}: DraggableFormContainerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter fields based on manager and super admin access
  const visibleFields = useMemo(() => {
    return fields.filter(field => {
      if (field.isSuperAdminOnly && !isSuperAdmin) return false;
      if (field.isManagerOnly && !isManager) return false;
      return true;
    });
  }, [fields, isManager, isSuperAdmin]);

  // Sort fields according to saved order
  const sortedFields = useMemo(() => {
    const fieldMap = new Map(visibleFields.map(f => [f.id, f]));
    const ordered: FormFieldConfig[] = [];
    
    // Add fields in saved order
    fieldOrder.forEach(id => {
      const field = fieldMap.get(id);
      if (field) {
        ordered.push(field);
        fieldMap.delete(id);
      }
    });
    
    // Add any remaining fields (new fields not in saved order)
    fieldMap.forEach(field => ordered.push(field));
    
    return ordered;
  }, [visibleFields, fieldOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedFields.findIndex(f => f.id === active.id);
      const newIndex = sortedFields.findIndex(f => f.id === over.id);
      
      const newSortedFields = arrayMove(sortedFields, oldIndex, newIndex);
      onOrderChange(newSortedFields.map(f => f.id));
    }
  };

  return (
    <div className="space-y-4">
      {!disabled && (
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4 ml-1" />
            איפוס סדר
          </Button>
          <Button
            type="button"
            variant={isDragMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleDragMode}
          >
            <Move className="h-4 w-4 ml-1" />
            {isDragMode ? 'סיום עריכה' : 'שינוי סדר שדות'}
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedFields.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={`space-y-4 ${isDragMode && !disabled ? 'pr-8' : ''} ${disabled ? 'pointer-events-none opacity-80' : ''}`}>
            {sortedFields.map((field) => (
              <DraggableFormField
                key={field.id}
                id={field.id}
                isDragEnabled={isDragMode && !disabled}
              >
                {field.component}
              </DraggableFormField>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
