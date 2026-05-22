export type Plan = 'free' | 'torcedor' | 'camisa' | 'campeao';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  plan: Plan;
  memberSince?: string;
}

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Eduardo Henrique',
  username: '@eduardo',
  avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=EH',
  plan: 'camisa',
  memberSince: '2025-01-10T10:00:00Z',
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  { id: 'u2', name: 'Marcos Silva', username: '@marcos_silva', avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=MS', plan: 'campeao' },
  { id: 'u3', name: 'Ana Paula', username: '@anapaula', avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=AP', plan: 'torcedor' },
  { id: 'u4', name: 'João Carlos', username: '@jcarlos', avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=JC', plan: 'free' },
  { id: 'u5', name: 'Jardim Camila admin', username: '@camilafc', avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=CA&backgroundColor=1B4FD8&textColor=F5C518', plan: 'campeao' },
];

export interface Post {
  id: string;
  author: User;
  content: string;
  imageUrl?: string;
  isExclusive: boolean;
  createdAt: string;
  likes: number;
  comments: number;
  isLikedByMe: boolean;
}

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    author: MOCK_USERS[4],
    content: 'Galera, domingo tem jogo! Vamos todos pro campo apoiar o Camila! 💪 #VamosJardimCamila',
    createdAt: '2026-04-20T14:30:00Z',
    likes: 45,
    comments: 12,
    isLikedByMe: true,
    isExclusive: false,
  },
  {
    id: 'p2',
    author: MOCK_USERS[1],
    content: 'Que golaço do Marquinhos hoje! Merecia assistência no campo 🔥',
    createdAt: '2026-04-21T18:15:00Z',
    likes: 22,
    comments: 4,
    isLikedByMe: false,
    isExclusive: false,
  },
  {
    id: 'p3',
    author: MOCK_USERS[4],
    content: 'Último treino antes do derby! A equipe tá focada. ⚽',
    imageUrl: 'https://placehold.co/600x400/1B4FD8/F5C518?text=Treino+Camila+FC',
    createdAt: '2026-04-23T10:00:00Z',
    likes: 56,
    comments: 8,
    isLikedByMe: true,
    isExclusive: false,
  },
  {
    id: 'p4',
    author: MOCK_USERS[4],
    content: 'Bastidores exclusivos do vestiário antes da final! Só pra quem é Sócio!',
    imageUrl: 'https://placehold.co/600x400/0D1117/FFFFFF?text=Conteudo+Exclusivo',
    createdAt: '2026-04-24T20:00:00Z',
    likes: 120,
    comments: 30,
    isLikedByMe: false,
    isExclusive: true,
  },
  {
    id: 'p5',
    author: MOCK_USERS[2],
    content: 'Alguém sabe me dizer se a camisa nova já chegou na sede?',
    createdAt: '2026-04-25T09:12:00Z',
    likes: 5,
    comments: 2,
    isLikedByMe: false,
    isExclusive: false,
  },
  {
    id: 'p6',
    author: MOCK_USERS[3],
    content: 'Infelizmente não vou poder ir pro jogo nesse finde. Estarei na torcida de longe! Pra cima deles, Camila!',
    createdAt: '2026-04-25T11:45:00Z',
    likes: 12,
    comments: 0,
    isLikedByMe: false,
    isExclusive: false,
  },
  {
    id: 'p7',
    author: MOCK_USERS[4],
    content: 'Nota oficial: Novo patrocínio master fechado para a próxima temporada! 🎉',
    createdAt: '2026-04-26T08:00:00Z',
    likes: 89,
    comments: 15,
    isLikedByMe: true,
    isExclusive: false,
  },
  {
    id: 'p8',
    author: MOCK_USERS[4],
    content: 'Vídeo da nossa torcida fazendo a festa no último jogo em casa. Vamo Camila!',
    imageUrl: 'https://placehold.co/600x400/F5C518/1B4FD8?text=Festa+da+Torcida',
    createdAt: '2026-04-26T10:30:00Z',
    likes: 210,
    comments: 45,
    isLikedByMe: true,
    isExclusive: false,
  },
];

export const MOCK_GOAL = {
  title: 'Uniformes para o Campeonato 2026',
  raisedAmount: 4820.00,
  targetAmount: 15000.00,
  percentage: 32.1,
};

export const MOCK_TRANSACTIONS = [
  { id: 't1', date: '2026-04-25T14:30:00Z', name: 'Eduardo H.', amount: 50.00, protocol: 'TXN-98231', status: 'Confirmado' },
  { id: 't2', date: '2026-04-25T13:15:00Z', name: 'Doador Anônimo', amount: 100.00, protocol: 'TXN-98230', status: 'Confirmado' },
  { id: 't3', date: '2026-04-25T10:05:00Z', name: 'Marcos Silva', amount: 25.00, protocol: 'TXN-98229', status: 'Confirmado' },
  { id: 't4', date: '2026-04-24T18:40:00Z', name: 'Doador Anônimo', amount: 200.00, protocol: 'TXN-98228', status: 'Pendente' },
  { id: 't5', date: '2026-04-24T15:20:00Z', name: 'Ana Paula', amount: 10.00, protocol: 'TXN-98227', status: 'Confirmado' },
  { id: 't6', date: '2026-04-23T20:10:00Z', name: 'João Carlos', amount: 50.00, protocol: 'TXN-98226', status: 'Confirmado' },
  { id: 't7', date: '2026-04-22T09:00:00Z', name: 'Doador Anônimo', amount: 15.00, protocol: 'TXN-98225', status: 'Confirmado' },
  { id: 't8', date: '2026-04-21T11:30:00Z', name: 'Roberto F.', amount: 100.00, protocol: 'TXN-98224', status: 'Confirmado' },
];

export const MOCK_RAFFLES = [
  {
    id: 'r1',
    title: 'Sorteio Abril — Plano Camisa',
    description: 'Concorra a uma camisa oficial autografada pelo elenco e 1 ano de Netflix grátis.',
    imageUrl: 'https://placehold.co/400x300/1B4FD8/FFFFFF?text=Camisa+Autografada',
    status: 'open',
    drawDate: '2026-04-30T20:00:00Z',
    participantsCount: 142,
    amIParticipating: true,
  },
  {
    id: 'r2',
    title: 'Sorteio Março — Todos os planos',
    description: '1 Chuteira society + Kit Churrasco do Camila FC.',
    imageUrl: 'https://placehold.co/400x300/F5C518/0D1117?text=Kit+Churrasco',
    status: 'closed',
    drawDate: '2026-03-31T20:00:00Z',
    winners: [
      { name: 'Ana Paula', prize: 'Chuteira Society' },
      { name: 'Eduardo H.', prize: 'Kit Churrasco' }
    ]
  }
];

export const MOCK_POOL = {
  title: 'Copa São Vicente — Rodada 3',
  matches: [
    { id: 'm1', date: '2026-05-02T15:00:00Z', homeTeam: 'Camila FC', awayTeam: 'Guarani', homeScore: null, awayScore: null, status: 'upcoming' },
    { id: 'm2', date: '2026-05-02T17:00:00Z', homeTeam: 'Vila Izabel', awayTeam: 'Juventus', homeScore: null, awayScore: null, status: 'upcoming' },
    { id: 'm3', date: '2026-05-03T09:00:00Z', homeTeam: 'Jd. Helena', awayTeam: 'Osasco FC', homeScore: null, awayScore: null, status: 'upcoming' },
    { id: 'm4', date: '2026-05-03T11:00:00Z', homeTeam: 'Nacional', awayTeam: 'Palmeirinha', homeScore: null, awayScore: null, status: 'upcoming' },
    { id: 'm5', date: '2026-05-03T15:00:00Z', homeTeam: 'Botafogo', awayTeam: 'Cruzeirinho', homeScore: null, awayScore: null, status: 'upcoming' },
  ],
  ranking: [
    { position: 1, user: MOCK_USERS[2], points: 25, correctScores: 2, correctOutcomes: 5 },
    { position: 2, user: MOCK_USERS[1], points: 18, correctScores: 1, correctOutcomes: 4 },
    { position: 3, user: MOCK_USERS[0], points: 15, correctScores: 1, correctOutcomes: 3 },
    { position: 4, user: MOCK_USERS[3], points: 12, correctScores: 0, correctOutcomes: 4 },
    { position: 5, user: { name: 'Roberto' }, points: 10, correctScores: 0, correctOutcomes: 3 },
    { position: 6, user: { name: 'Lucas T.' }, points: 8, correctScores: 0, correctOutcomes: 2 },
    { position: 7, user: { name: 'Fernando' }, points: 5, correctScores: 0, correctOutcomes: 1 },
    { position: 8, user: { name: 'Tiago S.' }, points: 5, correctScores: 0, correctOutcomes: 1 },
    { position: 9, user: { name: 'Beatriz' }, points: 3, correctScores: 0, correctOutcomes: 1 },
    { position: 10, user: { name: 'Carla' }, points: 0, correctScores: 0, correctOutcomes: 0 },
  ]
};

export const MOCK_COUNCIL = [
  {
    id: 'c1',
    category: 'INFRAESTRUTURA',
    question: 'Devemos usar 30% do saldo atual para reformar os vestiários?',
    description: 'O vestiário do time visitante precisa de reforma nos chuveiros e troca de piso.',
    deadline: '2026-06-15T23:59:59Z',
    participation: 82,
    status: 'open',
    myVote: null,
  },
  {
    id: 'c2',
    category: 'FUTEBOL',
    question: 'Aprovação da contratação do técnico Valdir para o sub-20',
    description: 'Valdir tem passagem pelo profissional e pede R$ 200/jogo.',
    deadline: '2026-04-10T23:59:59Z',
    participation: 95,
    status: 'closed',
    result: 'Aprovado (75% Sim)',
    myVote: 'yes',
  }
];
