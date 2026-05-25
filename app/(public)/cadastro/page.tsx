"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function getSignupErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("user already registered")) {
    return "Já existe uma conta com este email.";
  }

  if (normalizedMessage.includes("password")) {
    return "A senha precisa atender aos requisitos mínimos.";
  }

  if (normalizedMessage.includes("email")) {
    return "Confira o email informado e tente novamente.";
  }

  return "Não foi possível criar sua conta agora. Tente novamente em instantes.";
}

function buildUsername(fullName: string, email: string) {
  const source = fullName.trim() || email.split("@")[0] || "torcedor";

  return source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 40);
}

export default function CadastroPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setMessage(null);
    setIsSuccess(false);

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    if (!acceptedTerms) {
      setMessage("Você precisa aceitar os termos para criar sua conta.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
        data: {
          full_name: fullName.trim(),
          username: buildUsername(fullName, email),
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setMessage(getSignupErrorMessage(error.message));
      return;
    }

    if (data.session) {
      router.push("/home");
      return;
    }

    setIsSuccess(true);
    setMessage("Conta criada. Verifique seu email para confirmar o cadastro antes de entrar.");
  }

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-primary" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center border-2 border-accent mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Crie sua conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Junte-se ao Sócio Camila FC hoje</p>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              isSuccess
                ? "border-success/30 bg-success/10 text-success"
                : "border-danger/30 bg-danger/10 text-danger"
            }`}
          >
            {message}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSignup}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Nome Completo</label>
            <input 
              type="text" 
              placeholder="João da Silva"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              required
            />
          </div>

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
            <label className="text-sm font-semibold text-foreground">Senha</label>
            <input 
              type="password" 
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Confirmar Senha</label>
            <input 
              type="password" 
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              minLength={8}
              required
            />
          </div>

          <div className="pt-2">
            <div className="flex items-start gap-3 mb-6">
              <div className="pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="w-4 h-4 rounded text-primary bg-background border-border"
                />
              </div>
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                Eu concordo com os <a href="#" className="text-primary hover:underline">Termos de Uso</a> e <a href="#" className="text-primary hover:underline">Política de Privacidade</a> do E.C. Jardim Camila.
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent-dark disabled:opacity-70 disabled:cursor-not-allowed text-bg-dark font-black py-3 px-4 rounded-lg transition-colors shadow-md shadow-accent/20"
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Já tem uma conta? <Link href="/login" className="text-primary hover:text-primary-light font-bold transition-colors">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
