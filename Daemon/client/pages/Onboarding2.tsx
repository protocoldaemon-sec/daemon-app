import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Onboarding2() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50">
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need</h2>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Splash animation, onboarding, Solana login, a home with sidebar, and an AI Copilot chat — crafted with Poppins.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild className="px-6">
            <Link to="/login">Login with Solana</Link>
          </Button>
          <Button asChild variant="outline" className="px-6">
            <Link to="/">Back</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
