import { useTheme } from "@/hooks/useTheme";
import DaemonLogo from "@/assets/logo/daemon-logo.svg";
import DaemonLogoBlack from "@/assets/logo/daemon-logo-black.svg";

interface HeaderProps {
  title?: string;
  showNav?: boolean;
  children?: React.ReactNode;
  centerTitle?: boolean;
  bgOpacity?: number; // 0-100, default 80
  borderOpacity?: number; // 0-100, default follows bgOpacity
  showBorder?: boolean; // default true
  blur?: 'none' | 'sm' | 'md' | 'lg' | 'xl'; // default 'sm'
}

export default function Header({ 
  title = "Daemon", 
  showNav = false, 
  children,
  centerTitle = false,
  bgOpacity = 80,
  borderOpacity,
  showBorder = true,
  blur = 'sm'
}: HeaderProps) {
  const { isDark } = useTheme();
  
  // Calculate border opacity (default to half of bg opacity if not specified)
  const calcBorderOpacity = borderOpacity ?? Math.max(20, bgOpacity / 2);
  
  // Blur classes
  const blurClass = blur === 'none' ? '' : `backdrop-blur-${blur}`;
  
  // Background classes based on theme and opacity
  const bgClass = isDark
    ? `bg-slate-900/${bgOpacity}`
    : `bg-white/${bgOpacity}`;

  const borderClass = showBorder
    ? isDark
      ? `border-b border-slate-700/${calcBorderOpacity}`
      : `border-b border-slate-200/${calcBorderOpacity}`
    : '';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 md:px-6 ${bgClass} ${borderClass} ${blurClass}`}>
      {centerTitle ? (
        <>
          {/* Left spacer */}
          <div className="w-10" />
          
          {/* Center - Logo */}
          <div className="flex items-center justify-center">
            <img src={!isDark ? DaemonLogoBlack : DaemonLogo} alt="Daemon Logo" width={35} height={35} />
          </div>
          
          {/* Right spacer */}
          <div className="w-10" />
        </>
      ) : (
        <>
          {/* Left side - Logo */}
          <div className="flex items-center">
            <img src={!isDark ? DaemonLogoBlack : DaemonLogo} alt="Daemon Logo" width={35} height={35} />
          </div>

          {/* Center - Custom content */}
          {children && (
            <div className="flex-1 flex items-center justify-center px-4">
              {children}
            </div>
          )}

          {/* Right side - Optional navigation or actions */}
          {showNav ? (
            <div className="flex items-center gap-2">
              {/* Add navigation items here if needed */}
            </div>
          ) : (
            <div className="w-10" /> // Spacer for centering
          )}
        </>
      )}
    </header>
  );
}
