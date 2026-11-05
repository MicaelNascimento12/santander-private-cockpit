/**
 * Santander Private Cockpit - Assistente de IA Integrado (Advisor Copilot)
 * Motor de Respostas Dinâmicas Conectado em Tempo Real à Base de Clientes
 */

window.SPC = window.SPC || {};

window.SPC.Copilot = (function () {
  const { formatCurrency, formatPct } = window.SPC.Analytics;

  /**
   * Processa a pergunta do Advisor lendo o estado atual de clientes e o cliente selecionado
   */
  function generateResponse(query, clients, selectedClient) {
    const q = (query || "").toLowerCase().trim();
    const kpis = window.SPC.Analytics.calculateDashboardKPIs(clients);

    // 1. Verifica se o usuário mencionou o nome ou ID de algum cliente específico na pergunta
    const matchedClient = clients.find(
      (c) =>
        q.includes(c.id.toLowerCase()) ||
        c.name
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.length > 3 && !["família", "grupo", "holding", "para", "como"].includes(word) && q.includes(word))
    );

    // 2. Prompt Rápido 1: "Quais clientes estão com investimentos mais arriscados que o perfil?"
    if (
      q.includes("mais arriscados") ||
      q.includes("desenquadrad") ||
      q.includes("acima do perfil") ||
      q.includes("alerta") ||
      (q.includes("quais clientes") && q.includes("risco"))
    ) {
      const dangerList = clients
        .filter((c) => c.statusCode === "danger")
        .sort((a, b) => b.riskScore - a.riskLimit - (a.riskScore - a.riskLimit));
      const warningList = clients.filter((c) => c.statusCode === "warning");

      if (dangerList.length === 0 && warningList.length === 0) {
        return `
          <div class="copilot-card-block">
            <div class="copilot-tag ok">100% da Base Enquadrada</div>
            <p>Excelente notícia! Todos os <strong>${clients.length} clientes</strong> (${formatCurrency(kpis.totalAum)}) encontram-se atualmente enquadrados aos limites de risco de seus respectivos perfis.</p>
          </div>
        `;
      }

      const dangerItemsHtml = dangerList
        .map(
          (c) => `
          <div class="copilot-client-row danger" onclick="window.SPC.App.selectClient('${c.id}')">
            <div>
              <strong>${c.name}</strong> <span class="mono-badge">${c.id}</span>
              <div class="sub-line">Perfil <b>${c.profile}</b> • AuM: <b>${formatCurrency(c.aum)}</b> • RV + Alternativos: <b>${formatPct(c.volatileExposure, 0)}</b> (Teto: ${c.maxVolatileRecommended}%)</div>
            </div>
            <div class="right-metrics">
              <span class="score-pill danger">Score ${c.riskScore} / ${c.riskLimit}</span>
              <span class="action-link">Analisar →</span>
            </div>
          </div>`
        )
        .join("");

      const warningItemsHtml = warningList
        .map(
          (c) => `
          <div class="copilot-client-row warning" onclick="window.SPC.App.selectClient('${c.id}')">
            <div>
              <strong>${c.name}</strong> <span class="mono-badge">${c.id}</span>
              <div class="sub-line">Perfil <b>${c.profile}</b> • AuM: <b>${formatCurrency(c.aum)}</b> • RV + Alternativos: <b>${formatPct(c.volatileExposure, 0)}</b></div>
            </div>
            <div class="right-metrics">
              <span class="score-pill warning">Score ${c.riskScore} / ${c.riskLimit}</span>
              <span class="action-link">Analisar →</span>
            </div>
          </div>`
        )
        .join("");

      return `
        <p>Identifiquei <strong>${dangerList.length + warningList.length} clientes</strong> com exposição a risco acima do recomendado na base atual (totalizando <strong>${formatCurrency(kpis.totalCapitalAtRisk)}</strong> em capital alocado acima do limite prudencial):</p>
        ${
          dangerList.length > 0
            ? `<div class="copilot-section-title">🔴 Desenquadrados - Alto Risco (${dangerList.length} clientes — Ação Imediata)</div>
               <div class="copilot-list">${dangerItemsHtml}</div>`
            : ""
        }
        ${
          warningList.length > 0
            ? `<div class="copilot-section-title">🟠 Em Zona de Atenção (${warningList.length} clientes — Ajuste Tático)</div>
               <div class="copilot-list">${warningItemsHtml}</div>`
            : ""
        }
        <p class="copilot-tip">💡 <em>Clique em qualquer cliente acima para carregar os gráficos comparativos e aplicar o rebalanceamento automático.</em></p>
      `;
    }

    // 3. Prompt Rápido 2: "Gere um resumo de rebalanceamento para o cliente selecionado" (ou cliente mencionado)
    if (
      q.includes("rebalanceamento") ||
      q.includes("plano de ação") ||
      q.includes("recomend") ||
      q.includes("cliente selecionado") ||
      q.includes("cliente atual") ||
      matchedClient
    ) {
      const target = matchedClient || selectedClient || clients[0];
      if (!target) {
        return `<p>Por favor, selecione um cliente na tabela para gerar o plano de rebalanceamento detalhado.</p>`;
      }

      const plan = target.actionPlan;
      const tradesHtml = plan.classes
        .filter((cls) => Math.abs(cls.diffPct) >= 1)
        .map(
          (cls) => `
          <tr>
            <td><strong>${cls.label}</strong></td>
            <td class="text-right">${formatPct(cls.currentPct, 0)}</td>
            <td class="text-right">${formatPct(cls.targetPct, 0)}</td>
            <td class="text-right ${cls.diffPct > 0 ? "pos-text" : "neg-text"}">
              ${cls.diffPct > 0 ? "+" : ""}${formatPct(cls.diffPct, 0)} (${cls.diffPct > 0 ? "+" : "-"}${formatCurrency(Math.abs(cls.diffValue))})
            </td>
          </tr>`
        )
        .join("");

      return `
        <div class="copilot-card-block">
          <div class="copilot-header-line">
            <strong>Plano de Rebalanceamento: ${target.name} (${target.id})</strong>
            <span class="status-mini ${target.statusCode}">${target.status}</span>
          </div>
          <p class="sub-line">Patrimônio: <strong>${formatCurrency(target.aum)}</strong> | Perfil: <strong>${target.profile}</strong> | Retorno 12M: <strong>${formatPct(target.return12m, 2)} (${formatPct(target.cdiRatio, 1)} do CDI)</strong></p>
          <p><strong>1. Diagnóstico:</strong> ${plan.diagnosisText}</p>
          ${
            tradesHtml
              ? `<table class="copilot-mini-table">
                  <thead>
                    <tr>
                      <th>Classe de Ativo</th>
                      <th class="text-right">Atual</th>
                      <th class="text-right">Ideal</th>
                      <th class="text-right">Ordem Proposta (R$)</th>
                    </tr>
                  </thead>
                  <tbody>${tradesHtml}</tbody>
                </table>`
              : `<p><em>A carteira já está alinhada aos pesos ideais do modelo ${target.profile}.</em></p>`
          }
          <p><strong>2. Racional Macro:</strong> ${plan.macroJustification}</p>
          <div class="copilot-inline-actions">
            <button class="btn-copilot-action" onclick="window.SPC.App.openPresentationModal('${target.id}')">📄 Abrir Relatório para o Cliente</button>
            ${
              target.statusCode !== "ok"
                ? `<button class="btn-copilot-action primary" onclick="window.SPC.App.applyRecommendedAllocation('${target.id}')">⚡ Simular Enquadramento</button>`
                : ""
            }
          </div>
        </div>
      `;
    }

    // 4. Prompt Rápido 3: "Qual o impacto da alta do dólar nas carteiras atuais?"
    if (q.includes("dólar") || q.includes("dolar") || q.includes("câmbio") || q.includes("cambio") || q.includes("internacional") || q.includes("offshore")) {
      const sortedByIntl = [...clients].sort((a, b) => b.allocation.internacional - a.allocation.internacional);
      const totalIntlVolume = clients.reduce((acc, c) => acc + (c.aum * c.allocation.internacional) / 100, 0);
      const avgIntlPct = kpis.totalAum > 0 ? (totalIntlVolume / kpis.totalAum) * 100 : 0;

      const topBeneficiaries = sortedByIntl.slice(0, 3);
      const underExposed = [...clients]
        .filter((c) => c.allocation.internacional < c.targetAllocation.internacional)
        .sort((a, b) => (b.targetAllocation.internacional - b.allocation.internacional) * b.aum - (a.targetAllocation.internacional - a.allocation.internacional) * a.aum);

      return `
        <p>Com o <strong>USD/BRL avançando +1,18% (cotado a R$ 5,742)</strong> e o S&P 500 em 5.960 pts (+0,65%), analisei a exposição cambial consolidada da base:</p>
        <ul class="copilot-bullets">
          <li><strong>Exposição Offshore Consolidada:</strong> ${formatCurrency(totalIntlVolume)} (${formatPct(avgIntlPct, 1)} do AuM total de ${formatCurrency(kpis.totalAum)}).</li>
          <li><strong>Ganho Estimado na Sessão com o Câmbio:</strong> ~<strong>${formatCurrency(totalIntlVolume * 0.0118)}</strong> de impacto positivo direto nas parcelas dolarizadas.</li>
        </ul>
        <div class="copilot-section-title">🟢 Maiores Beneficiados (Hedge Cambial Ativo)</div>
        <div class="copilot-list">
          ${topBeneficiaries
            .map(
              (c) => `
            <div class="copilot-client-row ok" onclick="window.SPC.App.selectClient('${c.id}')">
              <div>
                <strong>${c.name}</strong> (${c.profile})
                <div class="sub-line">Alocação Internacional: <b>${formatPct(c.allocation.internacional, 0)}</b> (${formatCurrency((c.aum * c.allocation.internacional) / 100)}) vs. Meta ${formatPct(c.targetAllocation.internacional, 0)}</div>
              </div>
              <span class="score-pill ok">${formatPct(c.cdiRatio, 0)} CDI</span>
            </div>`
            )
            .join("")}
        </div>
        ${
          underExposed.length > 0
            ? `<div class="copilot-section-title">🟡 Oportunidade de Dolarização (Abaixo da Meta Offshore)</div>
               <p class="sub-line">Clientes com defasagem em proteção cambial frente ao modelo estratégico:</p>
               <div class="copilot-list">
                 ${underExposed
                   .slice(0, 3)
                   .map(
                     (c) => `
                   <div class="copilot-client-row warning" onclick="window.SPC.App.selectClient('${c.id}')">
                     <div>
                       <strong>${c.name}</strong> (${c.profile})
                       <div class="sub-line">Atual: <b>${formatPct(c.allocation.internacional, 0)}</b> → Recomendado: <b>${formatPct(c.targetAllocation.internacional, 0)}</b> (Alocar +${formatCurrency(((c.targetAllocation.internacional - c.allocation.internacional) / 100) * c.aum)})</div>
                     </div>
                     <span class="action-link">Ver Carteira →</span>
                   </div>`
                   )
                   .join("")}
               </div>`
            : ""
        }
      `;
    }

    // 5. Perguntas sobre Performance / CDI / Rentabilidade / Juros
    if (q.includes("cdi") || q.includes("rentabilidade") || q.includes("performance") || q.includes("abaixo") || q.includes("juros") || q.includes("renda fixa")) {
      const belowCdi = clients.filter((c) => c.cdiRatio < 100).sort((a, b) => a.cdiRatio - b.cdiRatio);
      const aboveCdi = clients.filter((c) => c.cdiRatio >= 100).sort((a, b) => b.cdiRatio - a.cdiRatio);

      return `
        <p>Com o <strong>CDI acumulado em 11,25% a.a.</strong> e abertura nos juros futuros (DI1F29 a 13,18%), a rentabilidade média ponderada da sua carteira sob gestão é de <strong>${formatPct(kpis.weightedReturn, 2)} (${formatPct(kpis.weightedCdiRatio, 1)} do CDI)</strong>.</p>
        <div class="copilot-section-title">📉 Carteiras Abaixo de 100% do CDI (${belowCdi.length} clientes — Prioridade de Rotação para RF High Grade)</div>
        <div class="copilot-list">
          ${belowCdi
            .map(
              (c) => `
            <div class="copilot-client-row ${c.statusCode}" onclick="window.SPC.App.selectClient('${c.id}')">
              <div>
                <strong>${c.name}</strong> <span class="mono-badge">${c.id}</span>
                <div class="sub-line">Retorno 12M: <b>${formatPct(c.return12m, 2)}</b> (${formatPct(c.cdiRatio, 1)} do CDI) • Renda Fixa Atual: ${formatPct(c.allocation.rendaFixa, 0)} (Ideal: ${formatPct(c.targetAllocation.rendaFixa, 0)})</div>
              </div>
              <span class="score-pill ${c.statusCode}">${formatPct(c.cdiRatio, 0)} CDI</span>
            </div>`
            )
            .join("")}
        </div>
        <div class="copilot-section-title">🏆 Destaques Acima do CDI (${aboveCdi.length} clientes)</div>
        <div class="copilot-list">
          ${aboveCdi
            .map(
              (c) => `
            <div class="copilot-client-row ok" onclick="window.SPC.App.selectClient('${c.id}')">
              <div>
                <strong>${c.name}</strong> (${c.profile})
                <div class="sub-line">Retorno 12M: <b>${formatPct(c.return12m, 2)}</b> (${formatPct(c.cdiRatio, 1)} do CDI) • AuM: ${formatCurrency(c.aum)}</div>
              </div>
              <span class="score-pill ok">${formatPct(c.cdiRatio, 0)} CDI</span>
            </div>`
            )
            .join("")}
        </div>
      `;
    }

    // 6. Pergunta sobre Abordagem Comercial / Script / Pitch para o cliente
    if (q.includes("script") || q.includes("abordagem") || q.includes("pitch") || q.includes("apresenta") || q.includes("argumento")) {
      const target = selectedClient || clients[0];
      return `
        <div class="copilot-card-block">
          <div class="copilot-tag">Roteiro Consultivo Private Banking</div>
          <p><strong>Cliente-Alvo:</strong> ${target.name} (${target.profile} • ${formatCurrency(target.aum)})</p>
          <blockquote class="copilot-pitch">
            "Olá, ${target.name.split(" ")[0]}. Ao revisarmos o posicionamento estratégico da sua carteira frente ao cenário de juros domésticos em 11,25% a.a. e abertura na curva futura (DI29 a 13,18%), identificamos uma oportunidade clara para proteger seu patrimônio e elevar a geração de caixa.
            ${
              target.statusCode !== "ok"
                ? `Hoje, ${formatPct(target.volatileExposure, 0)} do portfólio estão alocados em Renda Variável e Ativos Alternativos, o que limitou o retorno em ${formatPct(target.cdiRatio, 1)} do CDI. Nossa proposta é realocar ${formatCurrency(target.capitalAtExcessRisk)} para Títulos Soberanos e Emissões Bancárias High Grade AAA do Santander Private, reduzindo a volatilidade pela metade e buscando retorno próximo a ${target.actionPlan.targetCdiRatio}% do CDI."`
                : `Sua carteira performou ${formatPct(target.cdiRatio, 1)} do CDI com risco muito bem calibrado. Nossa recomendação agora é aproveitar os cupons vencendo este mês para travar taxas reais em NTN-B e LCI/LCA AAA isentas."`
            }
          </blockquote>
          <div class="copilot-inline-actions">
            <button class="btn-copilot-action primary" onclick="window.SPC.App.openPresentationModal('${target.id}')">📊 Abrir Modo Apresentação Executiva</button>
          </div>
        </div>
      `;
    }

    // 7. Resposta Inteligente Geral / Resumo Executivo da Carteira Sob Gestão
    const topDanger = clients.filter((c) => c.statusCode === "danger")[0];
    return `
      <p>Aqui está o panorama consolidado da sua carteira no <strong>Santander Private Cockpit</strong> em tempo real:</p>
      <ul class="copilot-bullets">
        <li><strong>Patrimônio Sob Gestão (AuM):</strong> ${formatCurrency(kpis.totalAum)} distribuídos em <strong>${kpis.totalClients} clientes Private</strong>.</li>
        <li><strong>Status de Risco:</strong> <span class="neg-text"><strong>${kpis.dangerCount} Desenquadrados (Alto Risco)</strong></span>, <strong>${kpis.warningCount} em Atenção</strong> e <span class="pos-text"><strong>${kpis.okCount} Enquadrados</strong></span>.</li>
        <li><strong>Capital Exposto Acima do Perfil:</strong> ${formatCurrency(kpis.totalCapitalAtRisk)} aguardando realocação tática.</li>
        <li><strong>Cliente Selecionado Agora:</strong> <strong>${selectedClient ? selectedClient.name : "Nenhum"}</strong> (${selectedClient ? selectedClient.status : ""}).</li>
      </ul>
      ${
        topDanger
          ? `<p>💡 <strong>Prioridade nº 1 da Mesa:</strong> O cliente <strong>${topDanger.name}</strong> (${topDanger.profile}, ${formatCurrency(topDanger.aum)}) apresenta Score de Risco de ${topDanger.riskScore} (limite ${topDanger.riskLimit}). Digite <em>"rebalanceamento"</em> ou clique nos atalhos abaixo para agir.</p>`
          : ""
      }
    `;
  }

  return {
    generateResponse
  };
})();
