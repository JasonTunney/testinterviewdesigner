import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import SettingsForm from "@/components/SettingsForm";

const Settings = () => {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();

  const handlePasswordSubmit = async () => {
    setIsChecking(true);
    setError("");
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ password, action: "read" }),
        }
      );
      if (resp.status === 401) {
        setError("Incorrect password");
        return;
      }
      if (!resp.ok) throw new Error("Failed to verify");
      setAuthenticated(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-xl text-foreground">SO</span>
          <span className="text-muted-foreground text-sm">Settings</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </nav>

      <main className="px-4 py-10 md:py-16 max-w-3xl mx-auto">
        {!authenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="p-4 rounded-full bg-secondary">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Enter Settings Password
            </h1>
            <p className="text-muted-foreground text-center">
              Access to interview configuration is password protected.
              <br />
              <span className="text-xs">Default password: admin123</span>
            </p>
            <div className="w-full max-w-sm space-y-3">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                className="bg-card text-foreground"
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                onClick={handlePasswordSubmit}
                disabled={!password || isChecking}
                className="w-full gradient-lime text-primary-foreground font-semibold"
              >
                {isChecking ? "Verifying..." : "Unlock Settings"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <SettingsForm password={password} />
        )}
      </main>
    </div>
  );
};

export default Settings;
