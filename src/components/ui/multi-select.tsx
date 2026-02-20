import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "בחר...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = selected.map(
    (val) => options.find((opt) => opt.value === val)?.label || val
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-right font-normal h-10 flex-row",
            !selected.length && "text-muted-foreground",
            className
          )}
          dir="rtl"
        >
          <div className="flex items-center gap-1 flex-1 overflow-hidden justify-start text-right">
            {selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : selected.length <= 2 ? (
              <span className="truncate">{selectedLabels.join(", ")}</span>
            ) : (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selected.length} נבחרו
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mr-2 border-r pr-2 h-full">
            <ChevronDown className="h-4 w-4 opacity-50" />
            {selected.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClear}
              />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[200px] p-0 z-50 bg-popover" align="start" dir="rtl">
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none transition-colors justify-between",
                  "hover:bg-accent hover:text-accent-foreground",
                  selected.includes(option.value) && "bg-accent/50"
                )}
                onClick={() => handleToggle(option.value)}
              >
                <span className="flex-1 text-right">{option.label}</span>
                <div
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary flex-shrink-0",
                    selected.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50"
                  )}
                >
                  {selected.includes(option.value) && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
