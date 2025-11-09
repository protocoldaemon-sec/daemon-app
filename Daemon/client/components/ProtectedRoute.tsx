import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAuth = false,
  requireGuest = false
}: ProtectedRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const walletAddress = localStorage.getItem('wallet_address');
      const walletType = localStorage.getItem('wallet_type');
      const token = localStorage.getItem('daemon_token');

      // User is considered authenticated if they have wallet connection or token
      const authenticated = !!(walletAddress && walletType) || !!token;
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (when user connects/disconnects wallet)
    const handleStorageChange = () => {
      checkAuth();
    };

    // Handle wallet connected event with delay to allow modal flow
    const handleWalletConnected = (event: CustomEvent) => {
      // Check if we're in connection flow - if so, don't redirect automatically
      const isInConnectionFlow = localStorage.getItem('isInConnectionFlow');

      if (isInConnectionFlow === 'true') {
        // Don't redirect during connection flow - let modal handle it
        return;
      }

      // Add small delay to allow modal flow to complete
      setTimeout(() => {
        checkAuth();
      }, 100);
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events when wallet state changes
    window.addEventListener('walletConnected', handleWalletConnected as EventListener);

    // Handle wallet disconnected event with redirect
    const handleWalletDisconnected = (event: CustomEvent) => {
      checkAuth();
      // If this was a manual disconnect and we're on a protected route, redirect to login
      if (event.detail?.redirect && requireAuth) {
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 100);
      }
    };

    window.addEventListener('walletDisconnected', handleWalletDisconnected as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('walletConnected', handleWalletConnected as EventListener);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected as EventListener);
    };
  }, [navigate, requireAuth]);

  // Show loading while checking authentication
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Route protection logic
  if (requireAuth && !isAuthenticated) {
    // User needs to be authenticated but isn't - redirect to login
    const loginPath = "/login";
    if (redirectTarget !== loginPath) {
      setRedirectTarget(loginPath);
      return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
    }
    // Return null to prevent rendering while redirect is in progress
    return null;
  }

  if (requireGuest && isAuthenticated) {
    // User needs to be guest (not authenticated) but is authenticated - redirect to home
    const chatPath = "/chat";
    if (redirectTarget !== chatPath) {
      setRedirectTarget(chatPath);
      return <Navigate to={chatPath} replace />;
    }
    // Return null to prevent rendering while redirect is in progress
    return null;
  }

  // Reset redirect target when access is granted
  if (redirectTarget) {
    setRedirectTarget(null);
  }

  // Access granted
  return <>{children}</>;
}

// Convenience components for common use cases
export function AuthRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAuth>{children}</ProtectedRoute>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireGuest>{children}</ProtectedRoute>;
}
