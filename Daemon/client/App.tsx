import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter } from "react-router-dom";
import AnimatedRoutes from "@/components/AnimatedRoutes";

const queryClient = new QueryClient();

// Use HashRouter for file:// protocol (mobile), BrowserRouter for web
const Router = window.location.protocol === 'file:' || 
               window.location.hostname === '' ||
               navigator.userAgent.includes('Android') 
  ? HashRouter 
  : BrowserRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <AnimatedRoutes />
        </Router>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
