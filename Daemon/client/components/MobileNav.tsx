import { useEffect, useState } from "react";
import {
  Menu,
  History,
  Settings,
  MessageSquare,
  LogOut,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { smartTruncateAddress } from "@/lib/walletUtils";
import { useTheme } from "@/hooks/useTheme";
import { useWallet } from "@/hooks/useWallet";

export default function MobileNav() {
  const [wallet, setWallet] = useState<string | null>(null);
  const navigate = useNavigate();
  const { disconnect } = useWallet();
  const { isDark } = useTheme();
  
  useEffect(() => {
    setWallet(localStorage.getItem("wallet_address"));
  }, []);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setWallet(null);
      // The wallet hook will handle the redirect automatically
    } catch (error) {
      console.error("Disconnect error:", error);
      // Still navigate to login even if disconnect fails
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex items-center">
      <Sheet>
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded-2xl bg-muted p-3 text-foreground mobile-shadow press-feedback mobile-gpu"
            style={{
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            <Menu className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          aria-label="Main menu"
          className="w-[85%] max-w-sm bg-background text-foreground p-0 mobile-container mobile-scroll"
        >
          <div className="flex h-full flex-col">
            <div className="px-6 pt-10 pb-6">
              <div className={`mx-auto mb-4 grid size-24 place-items-center rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <User className={`size-10 ${isDark ? 'text-white/80' : 'text-black/80'}`} />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mx-auto w-full max-w-xs sm:max-w-sm rounded-full bg-muted px-4 py-2 text-center text-sm font-medium cursor-help">
                      {smartTruncateAddress(wallet, 'mobile')}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="break-all text-xs">
                      {wallet || "No wallet connected"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="h-px w-full bg-border" />
            <nav className="flex flex-1 flex-col gap-2 px-6 py-6 text-sm">
              <NavItem to="/chat" icon={<MessageSquare className="size-5" />}>
                Chat
              </NavItem>
              <NavItem to="/history" icon={<History className="size-5" />}>
                History
              </NavItem>
              <NavItem to="/settings" icon={<Settings className="size-5" />}>
                Settings
              </NavItem>
              <NavItem to="/profile" icon={<User className="size-5" />}>
                Profile
              </NavItem>
            </nav>
            <div className="px-6 pb-8">
              <SheetClose asChild>
                <Button
                  onClick={handleDisconnect}
                  className="h-12 w-full rounded-xl bg-indigo-500 text-white hover:bg-indigo-500/90"
                >
                  <LogOut className="mr-2" /> Disconnect Wallet
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
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
    <SheetClose asChild>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-lg px-2 py-3 text-foreground/90 hover:bg-accent"
      >
        {icon}
        <span>{children}</span>
      </Link>
    </SheetClose>
  );
}
