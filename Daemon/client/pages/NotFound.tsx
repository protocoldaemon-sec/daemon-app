import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";

const NotFound = () => {
  const location = useLocation();
  const { isDark } = useTheme();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDark ? 'bg-slate-900' : 'bg-gray-100'
    }`}>
      <div className="text-center">
        <h1 className={`text-4xl font-bold mb-4 ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}>404</h1>
        <p className={`text-xl mb-4 ${
          isDark ? 'text-slate-400' : 'text-gray-600'
        }`}>Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
