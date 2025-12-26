"use client";

import { cn } from "@/lib/utils";

const COLORS = [
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Cyan", value: "#06b6d4" },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(color.value)}
          className={cn(
            "size-6 rounded-full transition-all",
            value === color.value
              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
              : "hover:scale-110",
            disabled && "cursor-not-allowed opacity-50",
          )}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  );
}
