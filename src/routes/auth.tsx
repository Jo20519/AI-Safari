import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Coins, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — Chiching" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // signup fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");

  // login fields
  const [liEmail, setLiEmail] = useState("");
  const [liPass, setLiPass] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !nationalId.trim()) {
      toast.error("Please complete all fields for verification.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail.trim(),
      password: suPass,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim(), phone: phone.trim(), national_id: nationalId.trim() },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Welcome to Chiching!");
    navigate({ to: "/dashboard" });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: liEmail.trim(), password: liPass });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed. Please try again.");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between gradient-hero p-12 text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold">
          <Coins className="size-7 text-gold" /> Chiching
        </Link>
        <div className="space-y-5 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Trust, transparency and growth for every chama.</h1>
          <p className="text-primary-foreground/80 text-lg">
            Track contributions, govern withdrawals together, and get supportive AI insights — built for Kenyan and
            African savings groups.
          </p>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <ShieldCheck className="size-5 text-gold" /> Every financial action is logged and auditable.
          </div>
        </div>
        <p className="text-sm text-primary-foreground/60">Human decisions always override AI recommendations.</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 font-display text-xl font-bold mb-8">
            <Coins className="size-6 text-primary" /> Chiching
          </Link>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" type="email" required value={liEmail} onChange={(e) => setLiEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="li-pass">Password</Label>
                  <Input id="li-pass" type="password" required value={liPass} onChange={(e) => setLiPass(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Wanjiru" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-phone">Phone</Label>
                    <Input id="su-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-id">National ID</Label>
                    <Input id="su-id" required value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="ID number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass">Password</Label>
                  <Input id="su-pass" type="password" required minLength={6} value={suPass} onChange={(e) => setSuPass(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your National ID is used only for identity verification and fraud prevention. Sensitive data is kept private.
                </p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
