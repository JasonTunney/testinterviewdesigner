import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Home, Settings as SettingsIcon, History as HistoryIcon, Users } from "lucide-react";

const AppNav = ({ subtitle }: { subtitle?: string }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <span className="font-display font-bold text-xl text-foreground">SO</span>
        <span className="text-muted-foreground text-sm">{subtitle ?? "Interview Designer"}</span>
      </Link>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}><Home className="w-4 h-4 mr-1" />Home</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/history")}><HistoryIcon className="w-4 h-4 mr-1" />History</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/people")}><Users className="w-4 h-4 mr-1" />People</Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}><SettingsIcon className="w-4 h-4 mr-1" />Settings</Button>
        {user && (
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="w-4 h-4 mr-1" />Sign out
          </Button>
        )}
      </div>
    </nav>
  );
};

export default AppNav;
