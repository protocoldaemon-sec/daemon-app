import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useGSAPStagger, useMagneticHover } from "@/hooks/useGSAP";
import { useEffect, useState } from "react";
import {
  History,
  Settings,
  MessageSquare,
  User,
  Sun,
  Moon,
} from "lucide-react";
// import DaemonLogo from "@/components/DaemonLogo";
import DaemonLogo from "@/assets/logo/daemon-logo.svg";
import DaemonLogoBlack from "@/assets/logo/daemon-logo-black.svg";
import { useWallet } from "@/hooks/useWallet";
import { useProfilePicture } from "@/hooks/useProfilePicture";
import { useTheme } from "@/hooks/useTheme";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { smartTruncateAddress } from "@/lib/walletUtils";

// Profile components
function ProfileAvatar() {
  const { profileImage, hasProfileImage } = useProfilePicture();

  if (hasProfileImage) {
    return (
      <img
        src={profileImage!}
        alt="Profile"
        className="w-8 h-8 rounded-full object-cover border-2 border-border mobile-gpu"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
      <User className="w-4 h-4 text-white" />
    </div>
  );
}

function ProfileName() {
  const { wallet } = useWallet();
  const walletAddress = wallet?.address;

  if (!wallet || !walletAddress) return "Not Connected";

  return smartTruncateAddress(walletAddress, 'desktop');
}

export default function Sidebar() {
  const navRef = useGSAPStagger('.nav-item', 0.2);
  const logoRef = useMagneticHover(0.2);
  const { theme, isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const logoSrc = (mounted && theme === 'light') ? DaemonLogoBlack : DaemonLogo;

  return (
    <aside className="h-screen w-64 shrink-0 border-r bg-sidebar/95 backdrop-blur-xl p-6 flex flex-col">
      <motion.div
        ref={logoRef}
        className="mb-6 flex items-center justify-between cursor-pointer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-2">
          {/* <DaemonLogo size={32} className="text-white" /> */}
          <img
            src={logoSrc}
            alt="Daemon Logo"
            width={35}
            height={35}
            className="transition-opacity duration-300"
          />
          <span className="text-lg font-semibold">Daemon</span>
        </div>

        <ThemeSwitcher />
      </motion.div>
      <nav ref={navRef} className="space-y-1 mb-6">
        <NavItem to="/chat" icon={<MessageSquare className="size-4" />}>
          Chat
        </NavItem>
        <NavItem to="/history" icon={<History className="size-4" />}>
          History
        </NavItem>
        <NavItem to="/settings" icon={<Settings className="size-4" />}>
          Settings
        </NavItem>
      </nav>
      {/* Profile Section */}
      <motion.div
        className="mt-auto pt-4 border-t border-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-300 border-l-2 relative overflow-hidden mb-3",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary shadow-sm font-semibold"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent",
            )
          }
        >
          {({ isActive }) => (
            <motion.div
              className="flex items-center gap-3 w-full relative z-10"
              whileHover={{
                x: 6,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              whileTap={{
                scale: 0.95,
                transition: { duration: 0.1 }
              }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  rotate: isActive ? [0, 360] : 0,
                }}
                transition={{
                  duration: isActive ? 0.6 : 0.3,
                  ease: "easeOut"
                }}
              >
                <ProfileAvatar />
              </motion.div>
              <motion.span
                animate={{
                  x: isActive ? 2 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="truncate"
              >
                <ProfileName />
              </motion.span>

              {/* Animated background glow for active state */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 -z-10"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.div>
          )}
        </NavLink>

        <motion.div
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          v0.1 • Daemon Seeker App. <br/> Powered by Daemon Blockint Technologies
        </motion.div>
      </motion.div>
    </aside>
  );
}

function NavItem({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "nav-item flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-300 border-l-2 relative overflow-hidden",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary shadow-sm font-semibold"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent",
        )
      }
    >
      {({ isActive }) => (
        <motion.div
          className="flex items-center gap-3 w-full relative z-10"
          whileHover={{ 
            x: 6,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          }}
          whileTap={{ 
            scale: 0.95,
            transition: { duration: 0.1 }
          }}
        >
          <motion.div
            animate={{ 
              scale: isActive ? 1.15 : 1,
              rotate: isActive ? [0, 360] : 0,
            }}
            transition={{ 
              duration: isActive ? 0.6 : 0.3,
              ease: "easeOut"
            }}
          >
            {icon}
          </motion.div>
          <motion.span
            animate={{
              x: isActive ? 2 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.span>
          
          {/* Animated background glow for active state */}
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 -z-10"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.div>
      )}
    </NavLink>
  );
}
