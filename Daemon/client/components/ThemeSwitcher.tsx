import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-9 h-9 rounded-md press-feedback"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "w-9 h-9 rounded-md press-feedback relative overflow-hidden transition-all duration-300 group",
        isDark
          ? "hover:bg-slate-800 text-slate-300 hover:text-slate-100"
          : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <div className="relative w-4 h-4">
        <Sun
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300",
            isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300",
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          )}
        />
      </div>

      {/* Animated background effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-md transition-all duration-500 opacity-0",
          isDark
            ? "bg-gradient-to-br from-slate-700 to-slate-600"
            : "bg-gradient-to-br from-yellow-100 to-orange-100",
          "group-hover:opacity-100"
        )}
      />
    </Button>
  );
}