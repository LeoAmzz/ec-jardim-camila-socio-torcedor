"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function redirectIfLoggedIn() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted && session?.user) {
        router.replace("/home");
      }
    }

    void redirectIfLoggedIn();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage("Email ou senha incorretos. Confira os dados e tente novamente.");
      return;
    }

    router.push("/home");
  }

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center border-2 border-accent mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground mt-1">Faça login para acessar sua conta</p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {message}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Email</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">Senha</label>
              <Link href="#" className="text-xs text-primary hover:text-primary-light font-semibold transition-colors">
                Esqueci minha senha
              </Link>
            </div>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-light disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors mt-6 shadow-md shadow-primary/20"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button type="button" className="w-full bg-background border border-border hover:bg-muted text-foreground font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-6">
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><g><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></g></svg>
          Continuar com Google
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta? <Link href="/cadastro" className="text-primary hover:text-primary-light font-bold transition-colors">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
