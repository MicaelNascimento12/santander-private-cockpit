/**
 * Santander Private Cockpit - Dados Iniciais, Cotações e Modelos Estratégicos
 * Arquitetura de Dados para Wealth Management / Private Banking
 */

window.SPC = window.SPC || {};

// Cotações de Mercado e Indicadores Macroeconômicos
window.SPC.MARKET_DATA = {
  cdiAnnual: 11.25,
  selicMeta: 11.25,
  ipca12m: 4.42,
  usdBrl: 5.74,
  tickers: [
    {
      id: "cdi",
      symbol: "CDI Anual",
      value: "11,25% a.a.",
      rawValue: 11.25,
      change: "+0,04% dia",
      trend: "up",
      badge: "Benchmark"
    },
    {
      id: "ibov",
      symbol: "IBOVESPA",
      value: "128.450 pts",
      rawValue: 128450,
      change: "-0,84%",
      trend: "down",
      badge: "B3"
    },
    {
      id: "usd",
      symbol: "USD / BRL",
      value: "R$ 5,742",
      rawValue: 5.742,
      change: "+1,18%",
      trend: "up",
      badge: "Câmbio PTAX"
    },
    {
      id: "sp500",
      symbol: "S&P 500",
      value: "5.960 pts",
      rawValue: 5960,
      change: "+0,65%",
      trend: "up",
      badge: "NYSE"
    },
    {
      id: "gold",
      symbol: "OURO (OZ1D)",
      value: "US$ 2.748/oz",
      rawValue: 2748,
      change: "+0,92%",
      trend: "up",
      badge: "Commodity"
    },
    {
      id: "di29",
      symbol: "DI1F29 (Juros)",
      value: "13,18% a.a.",
      rawValue: 13.18,
      change: "+0,16 p.p.",
      trend: "up",
      badge: "Curva Futura"
    }
  ],

  // 4 Manchetes Financeiras Simuladas e Impacto Direto nas Carteiras
  news: [
    {
      id: "news-1",
      time: "Há 18 min",
      category: "Juros & Renda Fixa",
      severity: "high",
      impactTag: "Renda Fixa (+) | Ações BR (-)",
      headline: "Alta nos juros futuros (DI1F29 +16 bps): prêmio elevado na curva doméstica",
      PortfolioImpact: "Oportunidade imediata em Renda Fixa pós-fixada e NTN-B curta/intermediária; alerta de pressão para clientes Conservadores e Moderados com excesso em Renda Variável doméstica e Small Caps.",
      filterType: "high-equity"
    },
    {
      id: "news-2",
      time: "Há 42 min",
      category: "Câmbio & Offshore",
      severity: "medium",
      impactTag: "Internacional (+) | Hedge Cambial",
      headline: "Dólar avança +1,18% (R$ 5,74) com fortalecimento global dos Treasuries",
      PortfolioImpact: "Carteiras com alocação Internacional entre 10% e 25% capturam proteção cambial relevante (alfa de +180 bps no mês). Clientes subalocados em ativos globais sofrem perda de poder de compra em moeda forte.",
      filterType: "fx-impact"
    },
    {
      id: "news-3",
      time: "Há 1h 15m",
      category: "Crédito & Alternativos",
      severity: "high",
      impactTag: "Alternativos (-) | High Grade (+)",
      headline: "Reavaliação de risco em ativos ilíquidos e FIIs High Yield no mercado secundário",
      PortfolioImpact: "Alerta de desenquadramento para portfólios com exposição superior a 10% em Ativos Alternativos/Estruturados. Recomendação de rotação tática para emissões bancárias AAA (LCI/LCA/Letras Financeiras) e Títulos Soberanos.",
      filterType: "high-alt"
    },
    {
      id: "news-4",
      time: "Há 2h 30m",
      category: "Mercados Globais",
      severity: "low",
      impactTag: "S&P 500 (+) | Multimercado (+)",
      headline: "S&P 500 renova máximas puxado por balanços corporativos sólidos nos EUA",
      PortfolioImpact: "Favorece mandatos Arrojados e Moderados posicionados em ETFs globais de qualidade (Quality/Tech) e fundos Multimercado Macro com book offshore ativo.",
      filterType: "all"
    }
  ]
};

// Modelos Estratégicos de Alocação Recomendada Ideal por Perfil (Santander Private Asset Allocation)
window.SPC.MODEL_PORTFOLIOS = {
  "Conservador": {
    allocation: {
      rendaFixa: 80,
      multimercado: 12,
      rendaVariavel: 0,
      internacional: 8,
      alternativos: 0
    },
    riskLimit: 25,       // Score máximo de risco permitido (0-100)
    attentionThreshold: 19,
    maxVolatilePct: 10,  // Soma máxima recomendada em RV + Alternativos + excesso MM
    targetCdiRatio: 106, // Meta de retorno em % do CDI
    expectedVol: "1,8% a.a.",
    description: "Foco absoluto em preservação patrimonial, alta liquidez diária e superação consistente do CDI via títulos soberanos e crédito bancário AAA."
  },
  "Moderado": {
    allocation: {
      rendaFixa: 55,
      multimercado: 20,
      rendaVariavel: 10,
      internacional: 10,
      alternativos: 5
    },
    riskLimit: 50,
    attentionThreshold: 42,
    maxVolatilePct: 22,
    targetCdiRatio: 118,
    expectedVol: "4,6% a.a.",
    description: "Equilíbrio entre carrego em Renda Fixa (juros reais + CDI) e diversificação descorrelacionada em Multimercados Macro e ativos globais dolarizados."
  },
  "Arrojado": {
    allocation: {
      rendaFixa: 32,
      multimercado: 23,
      rendaVariavel: 20,
      internacional: 15,
      alternativos: 10
    },
    riskLimit: 75,
    attentionThreshold: 66,
    maxVolatilePct: 40,
    targetCdiRatio: 132,
    expectedVol: "8,9% a.a.",
    description: "Busca de valorização patrimonial de longo prazo através de prêmios de risco globais, bolsa local selecionada, gestores macro e veículos alternativos exclusivos."
  }
};

// Rótulos e Metadados das Classes de Ativos
window.SPC.ASSET_CLASSES = [
  {
    key: "rendaFixa",
    label: "Renda Fixa",
    shortLabel: "Renda Fixa",
    fullLabel: "Renda Fixa Soberana & Crédito High Grade",
    riskWeight: 0.10, // Peso para cálculo do score de risco (0 a 1)
    color: "#1E293B",
    lightColor: "#475569"
  },
  {
    key: "multimercado",
    label: "Multimercado",
    shortLabel: "Multimercado",
    fullLabel: "Fundos Multimercado Macro & Quant",
    riskWeight: 0.45,
    color: "#3B82F6",
    lightColor: "#60A5FA"
  },
  {
    key: "internacional",
    label: "Internacional",
    shortLabel: "Internacional",
    fullLabel: "Internacional / Offshore (USD & EUR)",
    riskWeight: 0.55,
    color: "#0D9488",
    lightColor: "#2DD4BF"
  },
  {
    key: "rendaVariavel",
    label: "Renda Variável",
    shortLabel: "Renda Variável",
    fullLabel: "Renda Variável / Ações Brasil",
    riskWeight: 0.85,
    color: "#D97706",
    lightColor: "#FBBF24"
  },
  {
    key: "alternativos",
    label: "Alternativos / Alto Risco",
    shortLabel: "Alternativos",
    fullLabel: "Ativos Alternativos, Estruturados & Alto Risco",
    riskWeight: 1.00,
    color: "#EC0000",
    lightColor: "#F87171"
  }
];

// Meses de referência para o gráfico de 12 meses
window.SPC.MONTH_LABELS = [
  "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov"
];

// Curva acumulada do CDI nos últimos 12 meses (em % acumulado mês a mês até 11,25%)
window.SPC.CDI_CUMULATIVE_12M = [
  0.89, 1.82, 2.71, 3.65, 4.61, 5.58, 6.54, 7.52, 8.48, 9.41, 10.33, 11.25
];

// Base Inicial com 10 Clientes de Private Banking (Patrimônio entre R$ 5M e R$ 80M)
window.SPC.INITIAL_CLIENTS = [
  {
    id: "PB-1042",
    name: "Eduardo Vasconcelos & Família",
    age: 67,
    aum: 42500000, // R$ 42,5 milhões
    profile: "Conservador",
    banker: "Carolina Albuquerque, CFP®",
    segment: "Ultra High Net Worth",
    allocation: {
      rendaFixa: 48,
      multimercado: 16,
      rendaVariavel: 18,
      internacional: 6,
      alternativos: 12
    },
    return12m: 8.15, // 72,4% do CDI (sofreu com bolsa e alternativos num perfil conservador)
    cdi12m: 11.25,
    monthlyCumulative: [0.75, 1.40, 1.95, 2.80, 3.10, 4.05, 4.90, 5.60, 6.45, 7.10, 7.68, 8.15],
    liquidityDays: "D+15 (Baixa para o perfil)",
    notes: "Holding familiar pós-venda de indústria. Carteira herdou posições de corretoras externas em ações cíclicas e FIIs High Yield incompatíveis com mandato Conservador."
  },
  {
    id: "PB-1089",
    name: "Dra. Helena Monteiro de Barros",
    age: 58,
    aum: 18900000, // R$ 18,9 milhões
    profile: "Conservador",
    banker: "Rodrigo Santoro, CFA",
    segment: "Private Banking",
    allocation: {
      rendaFixa: 56,
      multimercado: 16,
      rendaVariavel: 16,
      internacional: 4,
      alternativos: 8
    },
    return12m: 8.89, // 79,0% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [0.80, 1.55, 2.20, 3.00, 3.65, 4.40, 5.20, 6.05, 6.80, 7.50, 8.22, 8.89],
    liquidityDays: "D+7",
    notes: "Médica e proprietária de rede de laboratórios. Possui 24% somados em Renda Variável e Alternativos, gerando volatilidade indesejada para plano de sucessão."
  },
  {
    id: "PB-1104",
    name: "Roberto Chagas Nogueira",
    age: 49,
    aum: 64200000, // R$ 64,2 milhões
    profile: "Moderado",
    banker: "Carolina Albuquerque, CFP®",
    segment: "Ultra High Net Worth",
    allocation: {
      rendaFixa: 26,
      multimercado: 18,
      rendaVariavel: 28,
      internacional: 8,
      alternativos: 20
    },
    return12m: 7.42, // 66,0% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [0.95, 1.60, 2.10, 2.45, 2.90, 3.70, 4.15, 4.95, 5.80, 6.35, 6.90, 7.42],
    liquidityDays: "D+45 (Concentração em Ilíquidos)",
    notes: "Empresário do agronegócio. Aumentou exposição por conta própria em fundos estruturados (FIDCs subordinados) e ações domésticas; risco muito acima do perfil Moderado."
  },
  {
    id: "PB-1156",
    name: "Marcelo & Patrícia Gouveia",
    age: 52,
    aum: 29400000, // R$ 29,4 milhões
    profile: "Moderado",
    banker: "Rodrigo Santoro, CFA",
    segment: "Private Banking",
    allocation: {
      rendaFixa: 42,
      multimercado: 22,
      rendaVariavel: 17,
      internacional: 9,
      alternativos: 10
    },
    return12m: 10.68, // 94,9% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [0.85, 1.72, 2.58, 3.45, 4.28, 5.15, 6.02, 6.95, 7.90, 8.85, 9.76, 10.68],
    liquidityDays: "D+5",
    notes: "Casal de executivos. Carteira em zona de Atenção devido à valorização recente de ativos de risco e sobrepeso leve em ações locais."
  },
  {
    id: "PB-1201",
    name: "Alexandre Tavares Bittencourt",
    age: 41,
    aum: 78500000, // R$ 78,5 milhões
    profile: "Arrojado",
    banker: "Carolina Albuquerque, CFP®",
    segment: "Family Office / UHNW",
    allocation: {
      rendaFixa: 12,
      multimercado: 15,
      rendaVariavel: 35,
      internacional: 14,
      alternativos: 24
    },
    return12m: 10.12, // 90,0% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [1.10, 2.05, 2.60, 3.15, 3.80, 4.90, 5.45, 6.70, 7.85, 8.40, 9.35, 10.12],
    liquidityDays: "D+60 (Alta iliquidez)",
    notes: "Fundador de empresa de tecnologia (exit recente). Mesmo sendo Arrojado, 59% em Renda Variável + Alternativos (Venture/Cripto) extrapola o teto institucional de risco."
  },
  {
    id: "PB-1238",
    name: "Beatriz Alencar Guimarães",
    age: 73,
    aum: 51800000, // R$ 51,8 milhões
    profile: "Conservador",
    banker: "Fernanda Paes Leme, CFP®",
    segment: "Ultra High Net Worth",
    allocation: {
      rendaFixa: 81,
      multimercado: 11,
      rendaVariavel: 0,
      internacional: 8,
      alternativos: 0
    },
    return12m: 12.15, // 108,0% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [0.96, 1.98, 2.94, 3.95, 4.98, 6.02, 7.05, 8.11, 9.15, 10.16, 11.15, 12.15],
    liquidityDays: "D+1 (Alta Liquidez)",
    notes: "Rentista com foco em renda passiva isenta (LCI/LCA/CRI AAA e NTN-B). Carteira 100% enquadrada ao modelo estratégico Santander Private."
  },
  {
    id: "PB-1275",
    name: "Henrique Siqueira Campos",
    age: 61,
    aum: 12400000, // R$ 12,4 milhões
    profile: "Conservador",
    banker: "Fernanda Paes Leme, CFP®",
    segment: "Private Banking",
    allocation: {
      rendaFixa: 68,
      multimercado: 15,
      rendaVariavel: 9,
      internacional: 3,
      alternativos: 5
    },
    return12m: 10.35, // 92,0% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [0.84, 1.68, 2.50, 3.35, 4.18, 5.05, 5.90, 6.80, 7.68, 8.58, 9.48, 10.35],
    liquidityDays: "D+4",
    notes: "Ex-diretor financeiro. Pequena posição residual em ações (9%) e FIIs (5%) coloca a carteira em status de Atenção para o perfil Conservador."
  },
  {
    id: "PB-1310",
    name: "Grupo Familiar Klabin-Meyer (Holding)",
    age: 55,
    aum: 36700000, // R$ 36,7 milhões
    profile: "Moderado",
    banker: "Rodrigo Santoro, CFA",
    segment: "Ultra High Net Worth",
    allocation: {
      rendaFixa: 54,
      multimercado: 20,
      rendaVariavel: 10,
      internacional: 11,
      alternativos: 5
    },
    return12m: 13.05, // 116,0% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [1.02, 2.12, 3.18, 4.25, 5.36, 6.48, 7.58, 8.70, 9.82, 10.90, 11.98, 13.05],
    liquidityDays: "D+3",
    notes: "Carteira modelo do segmento Moderado. Excelente captura de alfa via exposição Internacional dolarizada (11%) e Crédito High Grade."
  },
  {
    id: "PB-1349",
    name: "Gustavo Ferraz de Camargo",
    age: 38,
    aum: 8600000, // R$ 8,6 milhões
    profile: "Arrojado",
    banker: "Fernanda Paes Leme, CFP®",
    segment: "Private Banking",
    allocation: {
      rendaFixa: 33,
      multimercado: 22,
      rendaVariavel: 19,
      internacional: 16,
      alternativos: 10
    },
    return12m: 14.40, // 128,0% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [1.15, 2.35, 3.48, 4.65, 5.88, 7.12, 8.35, 9.60, 10.82, 12.04, 13.22, 14.40],
    liquidityDays: "D+5",
    notes: "Sócio de escritório jurídico. Forte performance impulsionada pela carteira Offshore (S&P 500 + Dólar) e fundos Multimercado Macro."
  },
  {
    id: "PB-1392",
    name: "Cláudia Regina Fontes",
    age: 64,
    aum: 6200000, // R$ 6,2 milhões
    profile: "Moderado",
    banker: "Carolina Albuquerque, CFP®",
    segment: "Private Banking",
    allocation: {
      rendaFixa: 31,
      multimercado: 19,
      rendaVariavel: 26,
      internacional: 5,
      alternativos: 19
    },
    return12m: 7.98, // 70,9% do CDI
    cdi12m: 11.25,
    monthlyCumulative: [0.72, 1.38, 1.92, 2.65, 3.20, 3.95, 4.68, 5.42, 6.18, 6.82, 7.40, 7.98],
    liquidityDays: "D+30",
    notes: "Carteira migrada recentemente de outra instituição com excesso crítico em COEs, ativos alternativos ilíquidos (19%) e ações locais (26%). Requer ação imediata."
  }
];
