/**
 * Santander Private Cockpit - Motor Analítico de Risco, Enquadramento e Plano de Ação
 */

window.SPC = window.SPC || {};

window.SPC.Analytics = (function () {
  // Limites calibrados por perfil de risco
  const PROFILE_THRESHOLDS = {
    "Conservador": { limit: 24, critical: 30, maxVolatile: 10 },
    "Moderado":    { limit: 40, critical: 46, maxVolatile: 20 },
    "Arrojado":    { limit: 56, critical: 62, maxVolatile: 34 }
  };

  /**
   * Formata valor monetário em R$ (ex: R$ 42,50 mi ou R$ 850 mil)
   */
  function formatCurrency(value, compact = true) {
    if (value === null || value === undefined || isNaN(value)) return "R$ 0";
    const absVal = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (compact) {
      if (absVal >= 1000000000) {
        return `${sign}R$ ${(absVal / 1000000000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bi`;
      }
      if (absVal >= 1000000) {
        return `${sign}R$ ${(absVal / 1000000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
      }
      if (absVal >= 1000) {
        return `${sign}R$ ${(absVal / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} mil`;
      }
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Formata percentual no padrão brasileiro
   */
  function formatPct(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return "0,0%";
    return `${Number(value).toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}%`;
  }

  /**
   * Calcula métricas completas de risco, enquadramento e performance de um cliente
   */
  function enrichClient(rawClient) {
    const profile = window.SPC.MODEL_PORTFOLIOS[rawClient.profile]
      ? rawClient.profile
      : "Moderado";

    const model = window.SPC.MODEL_PORTFOLIOS[profile];
    const thresholds = PROFILE_THRESHOLDS[profile];
    const alloc = rawClient.allocation || {
      rendaFixa: 50,
      multimercado: 20,
      rendaVariavel: 10,
      internacional: 10,
      alternativos: 10
    };

    // Normaliza caso a soma não seja exatamente 100%
    const totalAlloc =
      Number(alloc.rendaFixa || 0) +
      Number(alloc.multimercado || 0) +
      Number(alloc.rendaVariavel || 0) +
      Number(alloc.internacional || 0) +
      Number(alloc.alternativos || 0);

    const normFactor = totalAlloc > 0 ? 100 / totalAlloc : 1;
    const normalizedAlloc = {
      rendaFixa: Math.round(Number(alloc.rendaFixa || 0) * normFactor * 10) / 10,
      multimercado: Math.round(Number(alloc.multimercado || 0) * normFactor * 10) / 10,
      rendaVariavel: Math.round(Number(alloc.rendaVariavel || 0) * normFactor * 10) / 10,
      internacional: Math.round(Number(alloc.internacional || 0) * normFactor * 10) / 10,
      alternativos: Math.round(Number(alloc.alternativos || 0) * normFactor * 10) / 10
    };

    // Ajuste fino no maior componente para fechar 100.0%
    const sumNorm =
      normalizedAlloc.rendaFixa +
      normalizedAlloc.multimercado +
      normalizedAlloc.rendaVariavel +
      normalizedAlloc.internacional +
      normalizedAlloc.alternativos;
    if (Math.abs(100 - sumNorm) > 0.01) {
      normalizedAlloc.rendaFixa = Math.round((normalizedAlloc.rendaFixa + (100 - sumNorm)) * 10) / 10;
    }

    // Cálculo do Score de Risco (0 a 100)
    const rawScore =
      normalizedAlloc.rendaFixa * 0.10 +
      normalizedAlloc.multimercado * 0.45 +
      normalizedAlloc.internacional * 0.55 +
      normalizedAlloc.rendaVariavel * 0.85 +
      normalizedAlloc.alternativos * 1.00;

    const riskScore = Math.round(rawScore * 10) / 10;
    const riskLimit = thresholds.limit;
    const volatileExposure = Math.round((normalizedAlloc.rendaVariavel + normalizedAlloc.alternativos) * 10) / 10;
    const excessVolatile = Math.max(0, Math.round((volatileExposure - thresholds.maxVolatile) * 10) / 10);

    // Determinação do Status de Enquadramento
    let status = "Enquadrado";
    let statusCode = "ok"; // ok | warning | danger

    if (riskScore > thresholds.critical || volatileExposure > thresholds.maxVolatile + 8) {
      status = "Desenquadrado - Alto Risco";
      statusCode = "danger";
    } else if (riskScore > thresholds.limit || volatileExposure > thresholds.maxVolatile) {
      status = "Atenção";
      statusCode = "warning";
    }

    // Cálculo de rentabilidade vs CDI
    const cdi12m = Number(rawClient.cdi12m || window.SPC.MARKET_DATA.cdiAnnual || 11.25);
    const return12m = Number(rawClient.return12m || 10.0);
    const cdiRatio = Math.round((return12m / cdi12m) * 1000) / 10; // ex: 108.5% do CDI

    // Curva mensal acumulada (gera automaticamente se vier de CSV sem curva mensal)
    let monthlyCumulative = rawClient.monthlyCumulative;
    if (!Array.isArray(monthlyCumulative) || monthlyCumulative.length !== 12) {
      monthlyCumulative = [];
      for (let i = 1; i <= 12; i++) {
        const progress = i / 12;
        const wave = Math.sin(i * 0.65) * 0.22 * (1 - progress);
        monthlyCumulative.push(Math.round((return12m * progress + wave) * 100) / 100);
      }
      monthlyCumulative[11] = return12m;
    }

    // Volume financeiro em R$ alocado acima do limite recomendado em ativos de risco
    const excessRiskRatio = Math.max(0, (volatileExposure - thresholds.maxVolatile) / 100);
    const capitalAtExcessRisk = Number(rawClient.aum || 0) * excessRiskRatio;

    // Estimativa de Volatilidade Anualizada da carteira atual
    const estimatedVol = (
      normalizedAlloc.rendaFixa * 0.008 +
      normalizedAlloc.multimercado * 0.045 +
      normalizedAlloc.internacional * 0.11 +
      normalizedAlloc.rendaVariavel * 0.21 +
      normalizedAlloc.alternativos * 0.18
    ).toFixed(1);

    const enriched = {
      ...rawClient,
      profile,
      aum: Number(rawClient.aum || 10000000),
      age: Number(rawClient.age || 50),
      banker: rawClient.banker || "Advisory Desk Santander Private",
      segment: rawClient.segment || (Number(rawClient.aum) >= 30000000 ? "Ultra High Net Worth" : "Private Banking"),
      liquidityDays: rawClient.liquidityDays || (normalizedAlloc.alternativos >= 15 ? "D+30 (Moderada/Baixa)" : "D+3 (Alta Liquidez)"),
      allocation: normalizedAlloc,
      targetAllocation: { ...model.allocation },
      riskScore,
      riskLimit,
      volatileExposure,
      maxVolatileRecommended: thresholds.maxVolatile,
      excessVolatile,
      capitalAtExcessRisk,
      status,
      statusCode,
      return12m,
      cdi12m,
      cdiRatio,
      monthlyCumulative,
      estimatedVol: `${estimatedVol.replace(".", ",")}% a.a.`
    };

    enriched.actionPlan = generateActionPlan(enriched);
    return enriched;
  }

  /**
   * C. Plano de Ação Automatizado ("O que fazer com as informações")
   * Gera Diagnóstico, Recomendação Prática de Rebalanceamento e Justificativa Macroeconômica
   */
  function generateActionPlan(client) {
    const model = window.SPC.MODEL_PORTFOLIOS[client.profile];
    const curr = client.allocation;
    const targ = client.targetAllocation;
    const aum = client.aum;

    // Calcula as diferenças por classe de ativo
    const classes = window.SPC.ASSET_CLASSES.map((cls) => {
      const currentPct = curr[cls.key] || 0;
      const targetPct = targ[cls.key] || 0;
      const diffPct = Math.round((targetPct - currentPct) * 10) / 10; // positivo = aumentar, negativo = reduzir
      const diffValue = (diffPct / 100) * aum;
      return {
        key: cls.key,
        label: cls.label,
        fullLabel: cls.fullLabel,
        color: cls.color,
        currentPct,
        targetPct,
        diffPct,
        diffValue,
        currentValue: (currentPct / 100) * aum,
        targetValue: (targetPct / 100) * aum,
        action: diffPct < -1 ? "REDUZIR" : diffPct > 1 ? "AUMENTAR" : "MANTER"
      };
    });

    const reductions = classes.filter((c) => c.diffPct < -1).sort((a, b) => a.diffPct - b.diffPct);
    const increases = classes.filter((c) => c.diffPct > 1).sort((a, b) => b.diffPct - a.diffPct);

    // 1. Diagnóstico do Problema
    let diagnosisTitle = "";
    let diagnosisText = "";

    if (client.statusCode === "danger") {
      diagnosisTitle = `Exposição Crítica Acima do Perfil ${client.profile} (Score ${formatPct(client.riskScore, 0).replace("%", "")}/100 vs. Limite ${client.riskLimit}/100)`;
      diagnosisText =
        `Cliente de perfil ${client.profile} apresenta ${formatPct(client.volatileExposure, 0)} da carteira concentrados em Renda Variável (${formatPct(curr.rendaVariavel, 0)}) e Ativos Alternativos/Alto Risco (${formatPct(curr.alternativos, 0)}), ` +
        `superando em +${formatPct(client.excessVolatile, 0)} o teto prudencial de volatilidade (${client.maxVolatileRecommended}%). ` +
        `Há ${formatCurrency(client.capitalAtExcessRisk)} expostos a risco incompatível com o mandato, o que explica a performance de ${formatPct(client.return12m, 2)} nos últimos 12 meses (${formatPct(client.cdiRatio, 1)} do CDI) e a volatilidade estimada de ${client.estimatedVol}.`;
    } else if (client.statusCode === "warning") {
      diagnosisTitle = `Desvio Tático de Alocação — Zona de Atenção para o Perfil ${client.profile}`;
      diagnosisText =
        `A carteira possui Score de Risco de ${client.riskScore.toLocaleString("pt-BR")} pts (limite confortável de ${client.riskLimit} pts para o perfil ${client.profile}), ` +
        `com ${formatPct(client.volatileExposure, 0)} alocados em Renda Variável (${formatPct(curr.rendaVariavel, 0)}) e Alternativos (${formatPct(curr.alternativos, 0)}). ` +
        `Embora sem ruptura severa, o sobrepeso em ativos voláteis drenou alfa recente (${formatPct(client.cdiRatio, 1)} do CDI em 12M) e requer ajuste preventivo.`;
    } else {
      diagnosisTitle = `Portfólio Enquadrado e Alinhado ao Mandato Estratégico ${client.profile}`;
      diagnosisText =
        `A carteira está saudável e dentro dos parâmetros de risco do perfil ${client.profile} (Score ${client.riskScore.toLocaleString("pt-BR")} vs. Limite ${client.riskLimit}), ` +
        `entregando retorno consistente de ${formatPct(client.return12m, 2)} em 12 meses (${formatPct(client.cdiRatio, 1)} do CDI) com volatilidade controlada em ${client.estimatedVol}. ` +
        `Recomenda-se apenas manutenção tática e reinvestimento dos cupons de Renda Fixa e dividendos offshore.`;
    }

    // 2. Recomendação Prática de Rebalanceamento
    let recommendationText = "";
    if (reductions.length > 0 && increases.length > 0) {
      const redParts = reductions.map(
        (r) => `${formatPct(Math.abs(r.diffPct), 0)} em ${r.label} (${formatCurrency(Math.abs(r.diffValue))})`
      );
      const incParts = increases.map(
        (i) => `+${formatPct(i.diffPct, 0)} (${formatCurrency(i.diffValue)}) em ${i.fullLabel}`
      );
      recommendationText =
        `Reduzir ${redParts.join(" e ")}; realocar estrategicamente ${incParts.join(" e ")}. ` +
        `Com a operação, o Score de Risco recua de ${client.riskScore.toLocaleString("pt-BR")} para ${
          client.profile === "Conservador" ? "18,0" : client.profile === "Moderado" ? "33,5" : "48,5"
        } pts (Status: Enquadrado) e a meta de retorno passa para ${model.targetCdiRatio}% do CDI.`;
    } else {
      recommendationText =
        `Manter os pesos estruturais atuais (${formatPct(curr.rendaFixa, 0)} Renda Fixa, ${formatPct(curr.multimercado, 0)} Multimercado, ${formatPct(curr.internacional, 0)} Internacional). ` +
        `Realizar apenas rolagem de vencimentos curtos para NTN-B 2030/2035 e emissões bancárias isentas (LCI/LCA High Grade AAA) para travar taxas reais acima de IPCA + 6,8% a.a.`;
    }

    // 3. Justificativa Baseada no Cenário Econômico Atual (Consultiva & Macro)
    let macroJustification = "";
    const rfIncrease = classes.find((c) => c.key === "rendaFixa" && c.diffPct > 2);
    const intlIncrease = classes.find((c) => c.key === "internacional" && c.diffPct > 1);

    if (client.statusCode !== "ok") {
      macroJustification =
        `Com a taxa CDI em patamar contracionista (${window.SPC.MARKET_DATA.cdiAnnual.toLocaleString("pt-BR")}% a.a.) e abertura nos juros futuros (DI1F29 a 13,18% a.a.), ` +
        `o custo de oportunidade de carregar excesso em Renda Variável doméstica e Ativos Alternativos ilíquidos tornou-se assimétrico. ` +
        (rfIncrease
          ? `A migração de ${formatCurrency(rfIncrease.diffValue)} para Títulos Soberanos Pós-Fixados, NTN-B e Crédito Privado High Grade AAA captura juro real elevado com risco de crédito mínimo. `
          : "") +
        (intlIncrease
          ? `Adicionalmente, elevar a fatia Internacional para ${formatPct(targ.internacional, 0)} adiciona proteção cambial estrutural (USD/BRL a R$ 5,74) e exposição ao crescimento secular do S&P 500.`
          : "A consolidação na carteira recomendada reduz o drawdown máximo em mais de 45% mantendo liquidez imediata.");
    } else {
      macroJustification =
        `No cenário atual de juros domésticos elevados (CDI a 11,25% a.a.) combinado com dólar forte (R$ 5,74) e resiliência nos mercados desenvolvidos (S&P 500 a 5.960 pts), ` +
        `a combinação atual de carrego pós-fixado e diversificação offshore protege o patrimônio real da família contra a inflação (IPCA 4,42%) e choques geopolíticos.`;
    }

    // Texto executivo suavizado para o Modo Apresentação ao Cliente Final (sem jargão punitivo interno)
    const clientFacingHeadline =
      client.statusCode === "ok"
        ? "Portfólio Otimizado: Preservação e Eficiência Patrimonial"
        : "Proposta de Realinhamento Estratégico e Captura de Eficiência CDI+";

    const clientFacingSummary =
      client.statusCode === "ok"
        ? `Sua carteira encontra-se plenamente alinhada à estratégia recomendada pelo Santander Private Banking para o perfil ${client.profile}, superando o CDI nos últimos 12 meses (${formatPct(client.cdiRatio, 1)} do CDI) com baixa volatilidade.`
        : `Identificamos uma oportunidade estratégica para elevar a rentabilidade ajustada ao risco do seu patrimônio (${formatCurrency(aum)}). Ao rebalancear posições voláteis para títulos soberanos e crédito bancário AAA no atual ciclo de juros elevados (CDI 11,25% a.a.), projetamos aumento da previsibilidade de retornos para ~${model.targetCdiRatio}% do CDI e redução substancial das oscilações mensais.`;

    return {
      diagnosisTitle,
      diagnosisText,
      recommendationText,
      macroJustification,
      classes,
      reductions,
      increases,
      targetCdiRatio: model.targetCdiRatio,
      expectedVolAfter: model.expectedVol,
      clientFacingHeadline,
      clientFacingSummary
    };
  }

  /**
   * Calcula KPIs consolidados de toda a base de clientes carregada
   */
  function calculateDashboardKPIs(clients) {
    const totalClients = clients.length;
    const totalAum = clients.reduce((acc, c) => acc + c.aum, 0);
    const dangerClients = clients.filter((c) => c.statusCode === "danger");
    const warningClients = clients.filter((c) => c.statusCode === "warning");
    const okClients = clients.filter((c) => c.statusCode === "ok");
    const aboveProfileClients = clients.filter((c) => c.statusCode !== "ok");

    const totalCapitalAtRisk = clients.reduce((acc, c) => acc + c.capitalAtExcessRisk, 0);

    // Rentabilidade média ponderada pelo AuM
    const weightedReturn =
      totalAum > 0
        ? clients.reduce((acc, c) => acc + c.return12m * c.aum, 0) / totalAum
        : 0;
    const weightedCdiRatio = (weightedReturn / window.SPC.MARKET_DATA.cdiAnnual) * 100;

    return {
      totalClients,
      totalAum,
      dangerCount: dangerClients.length,
      warningCount: warningClients.length,
      okCount: okClients.length,
      aboveProfileCount: aboveProfileClients.length,
      totalCapitalAtRisk,
      weightedReturn: Math.round(weightedReturn * 100) / 100,
      weightedCdiRatio: Math.round(weightedCdiRatio * 10) / 10
    };
  }

  /**
   * Parser de arquivo CSV ou JSON para importação de base de clientes
   */
  function parseImportedFile(content, fileName) {
    const lowerName = (fileName || "").toLowerCase();
    if (lowerName.endsWith(".json") || content.trim().startsWith("[") || content.trim().startsWith("{")) {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : parsed.clients || [];
      return arr.map((item, idx) => normalizeImportedRecord(item, idx));
    }

    // Parser CSV (suporta separador vírgula ou ponto-e-vírgula)
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error("O arquivo CSV deve conter cabeçalho e pelo menos 1 linha de cliente.");
    }

    const delimiter = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

    const imported = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 4) continue;
      const rowObj = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = cols[colIdx];
      });
      imported.push(normalizeImportedRecord(rowObj, i));
    }
    return imported;
  }

  function normalizeImportedRecord(raw, idx) {
    // Mapeia possíveis nomes de colunas em português ou inglês
    const getVal = (...keys) => {
      for (const k of keys) {
        if (raw[k] !== undefined && raw[k] !== "") return raw[k];
      }
      return undefined;
    };

    const parseNum = (val, fallback) => {
      if (val === undefined || val === null || val === "") return fallback;
      if (typeof val === "number") return val;
      const cleaned = String(val).replace(/[R$\s%]/g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      return isNaN(num) ? fallback : num;
    };

    const id = getVal("id", "codigo", "cliente_id") || `PB-${2000 + idx}`;
    const name = getVal("name", "nome", "cliente") || `Cliente Private #${idx}`;
    const age = parseNum(getVal("age", "idade"), 52);
    let aum = parseNum(getVal("aum", "patrimonio", "patrimônio", "patrimonio_total"), 15000000);
    // Se o usuário informou em milhões no CSV (ex: 18.5 em vez de 18500000), converte para reais
    if (aum < 1000) aum = aum * 1000000;

    let profileRaw = String(getVal("profile", "perfil", "perfil_risco") || "Moderado").trim();
    let profile = "Moderado";
    if (/conservador/i.test(profileRaw)) profile = "Conservador";
    else if (/arrojado|agressivo/i.test(profileRaw)) profile = "Arrojado";

    const allocSource = raw.allocation || {};
    const rendaFixa = parseNum(
      allocSource.rendaFixa ?? getVal("rendafixa", "renda_fixa", "rf"),
      50
    );
    const multimercado = parseNum(
      allocSource.multimercado ?? getVal("multimercado", "mm"),
      20
    );
    const rendaVariavel = parseNum(
      allocSource.rendaVariavel ?? getVal("rendavariavel", "renda_variavel", "rv", "acoes"),
      12
    );
    const internacional = parseNum(
      allocSource.internacional ?? getVal("internacional", "intl", "offshore"),
      10
    );
    const alternativos = parseNum(
      allocSource.alternativos ?? getVal("alternativos", "alt", "alto_risco"),
      8
    );

    const return12m = parseNum(
      getVal("return12m", "rentabilidade_12m", "rentabilidade", "retorno_12m"),
      9.85
    );
    const cdi12m = parseNum(getVal("cdi12m", "cdi_12m", "cdi"), 11.25);

    return enrichClient({
      id,
      name,
      age,
      aum,
      profile,
      banker: getVal("banker", "advisor", "gerente") || "Advisory Desk Santander Private",
      notes: getVal("notes", "observacoes", "notas") || "Carteira importada via upload de base de dados.",
      allocation: {
        rendaFixa,
        multimercado,
        rendaVariavel,
        internacional,
        alternativos
      },
      return12m,
      cdi12m
    });
  }

  /**
   * Exporta a base atual de clientes para CSV
   */
  function exportClientsToCSV(clients) {
    const header = [
      "ID",
      "Nome",
      "Idade",
      "Patrimonio_Total",
      "Perfil_Risco",
      "Renda_Fixa_Pct",
      "Multimercado_Pct",
      "Renda_Variavel_Pct",
      "Internacional_Pct",
      "Alternativos_Pct",
      "Score_Risco",
      "Limite_Risco",
      "Status_Enquadramento",
      "Rentabilidade_12M_Pct",
      "CDI_12M_Pct",
      "Pct_do_CDI"
    ].join(";");

    const rows = clients.map((c) =>
      [
        c.id,
        `"${c.name}"`,
        c.age,
        c.aum,
        c.profile,
        c.allocation.rendaFixa,
        c.allocation.multimercado,
        c.allocation.rendaVariavel,
        c.allocation.internacional,
        c.allocation.alternativos,
        c.riskScore,
        c.riskLimit,
        `"${c.status}"`,
        c.return12m,
        c.cdi12m,
        c.cdiRatio
      ].join(";")
    );

    return [header, ...rows].join("\n");
  }

  return {
    formatCurrency,
    formatPct,
    enrichClient,
    generateActionPlan,
    calculateDashboardKPIs,
    parseImportedFile,
    exportClientsToCSV
  };
})();
