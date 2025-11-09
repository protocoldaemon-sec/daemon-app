import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useWallet } from "@/hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, Contrast } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  const { disconnect } = useWallet();
  const navigate = useNavigate();
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [product, setProduct] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your app preferences and settings</p>
        </div>

        {/* Theme section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              Appearance
            </CardTitle>
            <CardDescription>
              Choose your preferred theme for the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={theme}
              onValueChange={(v) => setTheme(v as "light" | "dark")}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="theme-light"
                className={cn(
                  "flex flex-col items-center justify-between rounded-lg border-2 p-4 cursor-pointer hover:bg-accent/50 transition-colors",
                  theme === "light"
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                <Sun className="h-8 w-8 mb-2 text-yellow-500" />
                <div className="text-center">
                  <div className="font-medium">Light</div>
                  <div className="text-xs text-muted-foreground">Clean and bright</div>
                </div>
              </Label>

              <Label
                htmlFor="theme-dark"
                className={cn(
                  "flex flex-col items-center justify-between rounded-lg border-2 p-4 cursor-pointer hover:bg-accent/50 transition-colors",
                  theme === "dark"
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                <Moon className="h-8 w-8 mb-2 text-blue-500" />
                <div className="text-center">
                  <div className="font-medium">Dark</div>
                  <div className="text-xs text-muted-foreground">Easy on the eyes</div>
                </div>
              </Label>
            </RadioGroup>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div>
                <div className="font-medium">Current Theme</div>
                <div className="text-sm text-muted-foreground">
                  {theme === "light" ? "Light mode is active" : "Dark mode is active"}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="press-feedback"
              >
                {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                Switch to {isDark ? "Light" : "Dark"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          </CardContent>
        </Card>

        {/* Notifications with switches */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive updates via email</div>
              </div>
              <Switch checked={email} onCheckedChange={setEmail} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Get instant alerts</div>
              </div>
              <Switch checked={push} onCheckedChange={setPush} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <div className="font-medium">Product Updates</div>
                <div className="text-sm text-muted-foreground">New features and improvements</div>
              </div>
              <Switch checked={product} onCheckedChange={setProduct} />
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Account
            </CardTitle>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="h-11 w-full rounded-xl press-feedback"
              onClick={async () => {
                try {
                  await disconnect();
                  // The wallet hook will handle the redirect automatically
                } catch (error) {
                  console.error("Disconnect error:", error);
                  // Fallback: manual redirect if hook fails
                  localStorage.removeItem("daemon_token");
                  localStorage.removeItem("wallet_address");
                  navigate("/login", { replace: true });
                }
              }}
            >
              Log Out
            </Button>
          </CardContent>
        </Card>

        {/* More */}
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-lg font-medium mb-2">More Settings</div>
            <p className="text-sm text-muted-foreground">
              Additional preferences and integrations coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
