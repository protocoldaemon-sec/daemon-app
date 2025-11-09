import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, LogIn } from "lucide-react";

export default function Onboarding1() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50">
      <div className="container mx-auto grid min-h-screen grid-rows-[1fr_auto] px-6 py-10">
        <main className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-8 h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg"
          />
          <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome to Daemon
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            A sleek, modern experience with Poppins + Tailwind. Secure Solana login and an AI Copilot to accelerate your workflow.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild className="px-6">
              <Link to="/onboarding-2">
                Continue
                <ChevronRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="px-6">
              <Link to="/login">
                <LogIn className="mr-1" />
                Login with Solana
              </Link>
            </Button>
          </div>
        </main>
        <footer className="py-6 text-center text-xs text-muted-foreground">
          By Bhaktiaji Ilham
        </footer>
      </div>
    </div>
  );
}
