# RULES.md — E.C. Jardim Camila | Plataforma de Sócio

> Este arquivo é a fonte de verdade do projeto.
> Todo agente de IA (Antigravity, Claude Code, Gemini, Cursor) deve ler e seguir estas regras antes de gerar ou modificar qualquer código.

---

## 1. IDENTIDADE DO PROJETO

- **Nome do clube:** E.C. Jardim Camila
- **Tipo:** Plataforma de sócio-torcedor para time de futebol de várzea
- **Público:** Torcedores e associados do clube
- **Idioma da interface:** Português Brasileiro (pt-BR)
- **Idioma do código:** Inglês (variáveis, funções, comentários, nomes de arquivo)

---

## 2. STACK TECNOLÓGICA

### Frontend
- **Framework:** Next.js 14 (App Router — NUNCA usar Pages Router)
- **Linguagem:** TypeScript (strict mode ativado)
- **Estilização:** Tailwind CSS v3
- **Componentes UI:** shadcn/ui (instalado via CLI, não copiar manualmente)
- **Ícones:** lucide-react
- **Formulários:** react-hook-form + zod para validação
- **Datas:** date-fns (pt-BR locale)
- **PDF cliente:** @react-pdf/renderer

### Backend
- **Rotas de API:** Next.js Route Handlers (`/app/api/...`)
- **ORM / Query:** Supabase JS Client (server-side com service role key)
- **Validação de entrada:** zod em todos os endpoints
- **PDF server-side:** @react-pdf/renderer em Edge Function ou Route Handler

### Banco de Dados e Infraestrutura
- **BaaS:** Supabase
  - PostgreSQL como banco principal
  - Supabase Auth para autenticação e sessão
  - Supabase Storage para imagens e PDFs
  - Supabase Realtime para feed, curtidas e saldo ao vivo
  - Row Level Security (RLS) ativado em TODAS as tabelas
- **Deploy:** Vercel (frontend + API routes)
- **Variáveis de ambiente:** nunca hardcoded, sempre via `.env.local`

### Pagamentos
- **Gateway:** Mercado Pago
- **Métodos:** PIX e Cartão de Crédito
- **Recorrência:** Assinatura mensal via Mercado Pago Subscriptions
- **Webhook:** `/api/webhooks/mercadopago` — validação HMAC obrigatória

---

## 3. IDENTIDADE VISUAL

### Paleta de Cores (CSS Variables — definir em `globals.css`)
```css
--color-primary: #1B4FD8;       /* Azul royal — cor principal do clube */
--color-primary-dark: #1338A8;   /* Azul escuro — hover, bordas */
--color-primary-light: #3B6FFF;  /* Azul claro — destaques */
--color-accent: #F5C518;         /* Amarelo — cor secundária do clube */
--color-accent-dark: #D4A80E;    /* Amarelo escuro — hover */
--color-white: #FFFFFF;          /* Branco — cor terciária do clube */
--color-bg-dark: #0D1117;        /* Fundo principal dark mode */
--color-bg-card: #161B22;        /* Fundo de cards */
--color-bg-sidebar: #0D1117;     /* Fundo da sidebar */
--color-border: #21262D;         /* Bordas sutis */
--color-text-primary: #F0F6FC;   /* Texto principal */
--color-text-secondary: #8B949E; /* Texto secundário / muted */
--color-success: #238636;        /* Verde — confirmações */
--color-danger: #DA3633;         /* Vermelho — erros, alertas */
```

### Tema
- **Modo padrão:** Dark mode (obrigatório)
- **Fonte:** Inter (Google Fonts) — sem exceções
- **Border radius padrão:** `rounded-lg` (8px) para cards, `rounded-full` para avatares e badges

### Referência visual
- Inspiração: Sócio Sofredor (layout, estrutura de navegação)
- Diferencial: cores do Camila (azul, amarelo, branco) em vez de tons genéricos

---

## 4. ESTRUTURA DE PASTAS

```
/app
  /(public)           # Rotas públicas (sem auth)
    /page.tsx         # Landing page institucional
    /transparencia    # Portal de transparência
    /login
    /cadastro
  /(platform)         # Rotas privadas (exige auth)
    /home             # Feed principal
    /buscar
    /notificacoes
    /conselho
    /sorteios
    /bolao
    /perfil
    /configuracoes
    /planos
  /api
    /webhooks
      /mercadopago    # POST — webhook de pagamento
    /doacoes
      /criar          # POST — criar preferência de pagamento
    /pdf
      /agradecimento  # GET — gerar PDF de confirmação
    /admin            # Rotas administrativas protegidas
      /sorteios
      /conselho
      /usuarios

/components
  /ui                 # Componentes shadcn/ui (não editar manualmente)
  /layout             # Sidebar, Header, BottomNav (mobile)
  /feed               # PostCard, CreatePost, FeedTabs
  /transparency       # DonationList, GoalProgress, TransactionRow
  /socio              # PlanCard, MemberBadge, MembershipCard
  /bolao              # MatchCard, LeaderboardRow
  /sorteio            # RaffleCard, WinnersModal
  /conselho           # VoteCard, CouncilStats
  /shared             # Avatar, Badge, Modal, Toast, LoadingSpinner

/lib
  /supabase
    /client.ts        # Supabase browser client
    /server.ts        # Supabase server client (com service role key)
  /mercadopago
    /client.ts        # Instância do SDK MP
    /webhook.ts       # Validação de assinatura HMAC
  /pdf
    /templates        # Templates React-PDF
  /validations        # Schemas Zod reutilizáveis
  /utils              # Funções utilitárias puras

/types
  /database.ts        # Tipos gerados pelo Supabase CLI
  /api.ts             # Tipos de request/response das APIs
  /domain.ts          # Tipos de domínio (User, Plan, Transaction, etc.)

/hooks
  /useAuth.ts
  /useRealtime.ts
  /usePlan.ts

/middleware.ts         # Proteção de rotas privadas via Supabase Auth
```

---

## 5. BANCO DE DADOS — TABELAS PRINCIPAIS

### Regra fundamental
> **Nunca atualizar um campo `total` diretamente.**
> O saldo total é sempre calculado via SQL a partir de transações aprovadas.

### Esquema resumido

```sql
-- Usuários (extende auth.users do Supabase)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  plan text DEFAULT 'free', -- free | torcedor | camisa | campeao
  plan_status text,         -- active | cancelled | past_due
  is_council_member boolean DEFAULT false,
  created_at timestamptz
)

-- Livro-caixa imutável (fonte de verdade financeira)
transactions (
  id uuid PRIMARY KEY,
  external_payment_id text UNIQUE, -- idempotência
  type text,   -- donation | subscription | refund | manual_adjustment
  status text, -- pending | approved | rejected | refunded | chargeback
  amount numeric(10,2),
  payer_name_public text,          -- nome exibido publicamente
  is_anonymous boolean DEFAULT false,
  gateway text DEFAULT 'mercadopago',
  goal_id uuid REFERENCES goals,
  user_id uuid REFERENCES profiles,
  created_at timestamptz,
  confirmed_at timestamptz
)

-- Metas de arrecadação
goals (
  id uuid PRIMARY KEY,
  title text,
  description text,
  target_amount numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz
)

-- Posts do feed
posts (
  id uuid PRIMARY KEY,
  author_id uuid REFERENCES profiles,
  content text,
  image_url text,
  is_exclusive boolean DEFAULT false, -- true = só para assinantes
  created_at timestamptz
)

-- Interações
likes (id, post_id, user_id, created_at)
comments (id, post_id, author_id, content, created_at)
notifications (id, user_id, type, payload jsonb, read boolean, created_at)

-- Sorteios
raffles (
  id uuid PRIMARY KEY,
  title text,
  description text,
  image_url text,
  eligible_plans text[],     -- planos que podem participar
  draw_date timestamptz,
  status text,               -- open | closed | drawn
  created_at timestamptz
)
raffle_entries (id, raffle_id, user_id, created_at)
raffle_winners (id, raffle_id, user_id, prize text, drawn_at timestamptz)

-- Bolão
match_pools (id, title, season, status, created_at)
matches (id, pool_id, home_team, away_team, match_date, home_score, away_score, status)
predictions (id, match_id, user_id, home_score, away_score, points_earned, created_at)

-- Conselho
council_votes (
  id uuid PRIMARY KEY,
  question text,
  category text,
  deadline timestamptz,
  min_participation numeric,
  status text,             -- open | closed
  created_at timestamptz
)
vote_options (id, vote_id, label)
vote_records (
  id uuid PRIMARY KEY,
  vote_id uuid,
  user_id uuid,
  option_id uuid,
  voted_at timestamptz,
  UNIQUE(vote_id, user_id)  -- um voto por pessoa
)
```

---

## 6. SEGURANÇA — REGRAS INEGOCIÁVEIS

### Supabase
- RLS ativado em **todas** as tabelas sem exceção
- `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor — jamais no cliente
- `SUPABASE_ANON_KEY` no cliente, com políticas RLS restritivas
- Políticas baseadas em `auth.uid()` e `plan` do perfil

### Pagamentos
- Webhook do Mercado Pago valida assinatura HMAC antes de qualquer lógica
- `external_payment_id` como chave única — idempotência obrigatória
- Log de todos os webhooks recebidos (inclusive os rejeitados)
- PDF gerado **somente** após status `approved` confirmado pelo webhook

### API Routes
- Validação de schema com Zod em todos os endpoints
- Rate limiting nas rotas públicas
- Admin routes verificam role no token JWT
- Nunca retornar stack trace ou mensagens de erro internas ao cliente

### LGPD
**Exibir publicamente:**
- Nome escolhido pelo doador (ou "Doador Anônimo")
- Valor da doação
- Data
- Número de protocolo

**Nunca exibir:**
- CPF, e-mail, telefone
- ID interno do pagamento
- Dados de cartão
- Endereço completo

---

## 7. PADRÕES DE CÓDIGO

### TypeScript
```typescript
// ✅ Correto
const getUserPlan = async (userId: string): Promise<Plan | null> => { }

// ❌ Errado
const getUserPlan = async (userId) => { }
```

- Strict mode sempre ligado (`"strict": true` no tsconfig)
- Sem `any` — usar `unknown` quando necessário
- Tipos de banco gerados pelo Supabase CLI em `/types/database.ts`

### Componentes React
```tsx
// ✅ Correto — named export com tipo explícito
type PostCardProps = {
  post: Post
  showActions?: boolean
}

export function PostCard({ post, showActions = true }: PostCardProps) { }

// ❌ Errado
export default function PostCard(props: any) { }
```

- Componentes de servidor por padrão (Next.js App Router)
- `"use client"` somente quando necessário (interatividade, hooks)
- Props sempre tipadas explicitamente — sem `any`

### Nomenclatura
| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes | PascalCase | `PostCard.tsx` |
| Hooks | camelCase com `use` | `useAuth.ts` |
| Funções utilitárias | camelCase | `formatCurrency.ts` |
| Constantes | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Tabelas SQL | snake_case | `raffle_entries` |
| Variáveis SQL | snake_case | `user_id` |
| Env vars | UPPER_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |

### Imports
```typescript
// Ordem obrigatória:
// 1. React / Next.js
// 2. Libs externas
// 3. Alias internos (@/...)
// 4. Tipos
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PostCard } from '@/components/feed/PostCard'
import type { Post } from '@/types/domain'
```

---

## 8. VARIÁVEIS DE AMBIENTE

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # apenas server-side

# Mercado Pago
MP_ACCESS_TOKEN=                  # apenas server-side
MP_WEBHOOK_SECRET=                # para validação HMAC
NEXT_PUBLIC_MP_PUBLIC_KEY=        # SDK cliente

# App
NEXT_PUBLIC_APP_URL=              # URL pública do deploy
ADMIN_SECRET=                     # proteção extra nas rotas /api/admin
```

> **Regra:** variáveis sem `NEXT_PUBLIC_` nunca chegam ao browser.

---

## 9. FLUXO DE PAGAMENTO — PASSO A PASSO

```
1. Usuário inicia pagamento (frontend)
2. POST /api/doacoes/criar → cria preferência no Mercado Pago
3. Registrar transação com status "pending" no banco
4. Redirecionar para checkout Mercado Pago
5. Mercado Pago processa e chama POST /api/webhooks/mercadopago
6. Validar assinatura HMAC
7. Verificar idempotência (external_payment_id já existe?)
8. Se approved: atualizar status → gerar PDF → enviar e-mail
9. Saldo recalculado via SQL (SELECT SUM de transactions WHERE status = 'approved')
10. Supabase Realtime notifica frontend — saldo atualiza na tela
```

---

## 10. NÍVEIS DE SÓCIO

| Plano | Nome | Acesso |
|-------|------|--------|
| `free` | Torcedor | Feed geral, perfil básico |
| `torcedor` | Camisa | Feed exclusivo, bolão, sorteios básicos |
| `camisa` | Campeão | Tudo anterior + conselho, sorteios premium |
| `campeao` | Fundador | Tudo + benefícios físicos (camisa, carteirinha) |

- Verificação de plano sempre no servidor via RLS ou middleware
- Nunca confiar no `plan` enviado pelo cliente

---

## 11. O QUE NÃO FAZER

- ❌ Pages Router — somente App Router
- ❌ `useEffect` para buscar dados — usar Server Components ou React Query
- ❌ Atualizar `saldo_total` diretamente — sempre recalcular de `transactions`
- ❌ `SUPABASE_SERVICE_ROLE_KEY` em componente cliente
- ❌ Processar pagamento sem validar webhook HMAC
- ❌ Registrar doação antes do webhook `approved`
- ❌ Exibir CPF, e-mail ou dados sensíveis no portal público
- ❌ `any` no TypeScript
- ❌ Componentes sem tipagem de props
- ❌ Lógica de negócio crítica no frontend
- ❌ Instalar libs sem verificar se shadcn/ui já resolve

---

## 12. CHECKLIST DE NOVA FEATURE

Antes de considerar uma feature pronta, verificar:

- [ ] Tipos TypeScript definidos em `/types`
- [ ] Validação Zod no endpoint de API
- [ ] RLS configurado no Supabase para a tabela envolvida
- [ ] Sem dados sensíveis expostos ao cliente
- [ ] Loading state implementado no componente
- [ ] Error state implementado no componente
- [ ] Responsivo (mobile-first)
- [ ] Testado em dark mode
- [ ] Sem `console.log` no código final
- [ ] Variáveis de ambiente documentadas no `.env.example`