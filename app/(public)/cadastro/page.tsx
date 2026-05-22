import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function CadastroPage() {
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

        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Nome Completo</label>
            <input 
              type="text" 
              placeholder="João da Silva"
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Email</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Senha</label>
            <input 
              type="password" 
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Confirmar Senha</label>
            <input 
              type="password" 
              placeholder="Digite a senha novamente"
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            />
          </div>

          <div className="pt-2">
            <div className="flex items-start gap-3 mb-6">
              <div className="pt-1">
                <input type="checkbox" id="terms" className="w-4 h-4 rounded text-primary bg-background border-border" />
              </div>
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                Eu concordo com os <a href="#" className="text-primary hover:underline">Termos de Uso</a> e <a href="#" className="text-primary hover:underline">Política de Privacidade</a> do E.C. Jardim Camila.
              </label>
            </div>
            <button className="w-full bg-accent hover:bg-accent-dark text-bg-dark font-black py-3 px-4 rounded-lg transition-colors shadow-md shadow-accent/20">
              Criar conta
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
