/**
 * Santander Private Cockpit - Controlador Principal da Aplicação (UI, Gráficos Chart.js, Eventos e Modais)
 */

window.SPC = window.SPC || {};

window.SPC.App = (function () {
  const {
    formatCurrency,
    formatPct,
    enrichClient,
    calculateDashboardKPIs,
    parseImportedFile,
    exportClientsToCSV
  } = window.SPC.Analytics;

  // Estado Central da Aplicação
  const state = {
    clients: [],
    originalAllocations: {}, // Guarda alocação inicial para permitir resetar simulações
    selectedClientId: null,
    filterStatus: "all",     // all | above-profile | danger | warning | ok
    filterProfile: "all",    // all | Conservador | Moderado | Arrojado
    searchQuery: "",
    allocationChartType: "bar", // bar | radar
    charts: {
      allocation: null,
      performance: null,
      reportCurrent: null,
      reportTarget: null,
      reportPerformance: null
    }
  };

  /**
   * Inicialização do Cockpit
   */
  function init() {
    loadInitialClients();
    renderMarketTickers();
    renderMarketNews();
    bindEvents();
    renderAll();
    initCopilotWelcome();
  }

  function loadInitialClients() {
    state.clients = window.SPC.INITIAL_CLIENTS.map((c) => {
      const enriched = enrichClient(JSON.parse(JSON.stringify(c)));
      state.originalAllocations[enriched.id] = {
        allocation: { ...enriched.allocation },
        return12m: enriched.return12m
      };
      return enriched;
    });
    if (state.clients.length > 0) {
      state.selectedClientId = state.clients[0].id;
    }
  }

  function getSelectedClient() {
    return (
      state.clients.find((c) => c.id === state.selectedClientId) ||
      state.clients[0] ||
      null
    );
  }

  /**
   * Renderiza todos os componentes dinâmicos do Dashboard
   */
  function renderAll() {
    renderKPIs();
    renderClientTable();
    renderSelectedClientDetail();
  }

  /**
   * A.1 Renderiza o Ticker de Cotações no Topo
   */
  function renderMarketTickers() {
    const container = document.getElementById("market-ticker-list");
    if (!container) return;

    container.innerHTML = window.SPC.MARKET_DATA.tickers
      .map(
        (t) => `
      <div class="ticker-item">
        <div class="ticker-top">
          <span class="ticker-symbol">${t.symbol}</span>
          <span class="ticker-badge">${t.badge}</span>
        </div>
        <div class="ticker-bottom">
          <span class="ticker-value">${t.value}</span>
          <span class="ticker-change ${t.trend === "up" ? "up" : "down"}">
            ${t.trend === "up" ? "▲" : "▼"} ${t.change}
          </span>
        </div>
      </div>
    `
      )
      .join("");
  }

  /**
   * Simula atualização das cotações de mercado em tempo real
   */
  function simulateMarketTick() {
    const tickers = window.SPC.MARKET_DATA.tickers;
    // Oscila levemente Ibovespa, Dólar, S&P 500 e Ouro
    const ibov = tickers.find((t) => t.id === "ibov");
    const usd = tickers.find((t) => t.id === "usd");
    const sp = tickers.find((t) => t.id === "sp500");

    if (ibov) {
      const delta = Math.round((Math.random() - 0.48) * 320);
      ibov.rawValue += delta;
      ibov.value = `${ibov.rawValue.toLocaleString("pt-BR")} pts`;
    }
    if (usd) {
      const delta = (Math.random() - 0.45) * 0.018;
      usd.rawValue = Math.round((usd.rawValue + delta) * 1000) / 1000;
      usd.value = `R$ ${usd.rawValue.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
    }
    if (sp) {
      const delta = Math.round((Math.random() - 0.45) * 12);
      sp.rawValue += delta;
      sp.value = `${sp.rawValue.toLocaleString("pt-BR")} pts`;
    }

    renderMarketTickers();
    showToast("Cotações de mercado sincronizadas com o feed B3 / Bloomberg.");
  }

  /**
   * A.2 Renderiza o Radar de Mercado (4 Manchetes Financeiras e Impacto Direto)
   */
  function renderMarketNews() {
    const container = document.getElementById("market-news-list");
    if (!container) return;

    container.innerHTML = window.SPC.MARKET_DATA.news
      .map(
        (n) => `
      <article class="news-card severity-${n.severity}">
        <div class="news-meta">
          <span class="news-category">${n.category}</span>
          <span class="news-impact-tag">${n.impactTag}</span>
          <span class="news-time">${n.time}</span>
        </div>
        <h4 class="news-headline">${n.headline}</h4>
        <div class="news-impact-box">
          <span class="impact-label">Impacto nas Carteiras:</span>
          <p>${n.PortfolioImpact}</p>
        </div>
        <div class="news-actions">
          <button class="btn-news-link" onclick="window.SPC.App.handleNewsAction('${n.id}')">
            Analisar impacto no Copilot →
          </button>
        </div>
      </article>
    `
      )
      .join("");
  }

  function handleNewsAction(newsId) {
    const item = window.SPC.MARKET_DATA.news.find((n) => n.id === newsId);
    if (!item) return;

    if (item.filterType === "fx-impact") {
      sendQuickPrompt("Qual o impacto da alta do dólar nas carteiras atuais?");
    } else if (item.filterType === "high-equity" || item.filterType === "high-alt") {
      setRiskFilter("above-profile");
      sendQuickPrompt("Quais clientes estão com investimentos mais arriscados que o perfil?");
    } else {
      sendQuickPrompt("Quais carteiras renderam abaixo do CDI nos últimos 12 meses?");
    }

    const copilotEl = document.getElementById("copilot-section");
    if (copilotEl) {
      copilotEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /**
   * B.1 Renderiza os KPIs Gerenciais no Topo
   */
  function renderKPIs() {
    const kpis = calculateDashboardKPIs(state.clients);

    const aumEl = document.getElementById("kpi-total-aum");
    const aumSubEl = document.getElementById("kpi-aum-sub");
    const clientsEl = document.getElementById("kpi-total-clients");
    const clientsSubEl = document.getElementById("kpi-clients-sub");
    const alertsEl = document.getElementById("kpi-alerts-count");
    const alertsSubEl = document.getElementById("kpi-alerts-sub");
    const perfEl = document.getElementById("kpi-avg-return");
    const perfSubEl = document.getElementById("kpi-return-sub");

    if (aumEl) aumEl.textContent = formatCurrency(kpis.totalAum);
    if (aumSubEl) {
      const avg = kpis.totalClients > 0 ? kpis.totalAum / kpis.totalClients : 0;
      aumSubEl.textContent = `Ticket médio: ${formatCurrency(avg)} por cliente`;
    }

    if (clientsEl) clientsEl.textContent = kpis.totalClients;
    if (clientsSubEl) {
      const cons = state.clients.filter((c) => c.profile === "Conservador").length;
      const mod = state.clients.filter((c) => c.profile === "Moderado").length;
      const arr = state.clients.filter((c) => c.profile === "Arrojado").length;
      clientsSubEl.textContent = `${cons} Conservador • ${mod} Moderado • ${arr} Arrojado`;
    }

    if (alertsEl) {
      alertsEl.innerHTML = `${kpis.dangerCount} <span class="kpi-inline-warn">+ ${kpis.warningCount} em atenção</span>`;
    }
    if (alertsSubEl) {
      alertsSubEl.textContent = `${formatCurrency(kpis.totalCapitalAtRisk)} expostos acima do perfil`;
    }

    if (perfEl) {
      perfEl.textContent = `${formatPct(kpis.weightedReturn, 2)}`;
    }
    if (perfSubEl) {
      perfSubEl.textContent = `Equivalente a ${formatPct(kpis.weightedCdiRatio, 1)} do CDI (11,25% a.a.)`;
    }

    // Atualiza contadores nos botões de filtro
    const badgeAll = document.getElementById("badge-count-all");
    const badgeAbove = document.getElementById("badge-count-above");
    const badgeDanger = document.getElementById("badge-count-danger");
    const badgeOk = document.getElementById("badge-count-ok");

    if (badgeAll) badgeAll.textContent = kpis.totalClients;
    if (badgeAbove) badgeAbove.textContent = kpis.aboveProfileCount;
    if (badgeDanger) badgeDanger.textContent = kpis.dangerCount;
    if (badgeOk) badgeOk.textContent = kpis.okCount;
  }

  /**
   * Filtra clientes de acordo com o filtro rápido de risco, perfil e busca textual
   */
  function getFilteredClients() {
    return state.clients.filter((c) => {
      if (state.filterStatus === "above-profile" && c.statusCode === "ok") return false;
      if (state.filterStatus === "danger" && c.statusCode !== "danger") return false;
      if (state.filterStatus === "warning" && c.statusCode !== "warning") return false;
      if (state.filterStatus === "ok" && c.statusCode !== "ok") return false;

      if (state.filterProfile !== "all" && c.profile !== state.filterProfile) return false;

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchId = c.id.toLowerCase().includes(q);
        const matchProfile = c.profile.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchProfile) return false;
      }
      return true;
    });
  }

  /**
   * B.2 Renderiza a Tabela Gerencial de Monitoramento de Carteiras
   */
  function renderClientTable() {
    const tbody = document.getElementById("clients-table-body");
    const emptyState = document.getElementById("clients-empty-state");
    if (!tbody) return;

    const filtered = getFilteredClients();

    if (filtered.length === 0) {
      tbody.innerHTML = "";
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }
    if (emptyState) emptyState.classList.add("hidden");

    tbody.innerHTML = filtered
      .map((c) => {
        const isSelected = c.id === state.selectedClientId;
        const riskRatioPct = Math.min(100, Math.round((c.riskScore / 80) * 100));
        const limitPosPct = Math.min(100, Math.round((c.riskLimit / 80) * 100));

        return `
        <tr class="client-row ${isSelected ? "selected" : ""} status-row-${c.statusCode}" onclick="window.SPC.App.selectClient('${c.id}')">
          <td>
            <div class="client-main-cell">
              <div class="client-avatar ${c.statusCode}">${getInitials(c.name)}</div>
              <div>
                <div class="client-name-line">
                  <span class="client-name">${c.name}</span>
                  <span class="client-id-badge">${c.id}</span>
                </div>
                <div class="client-sub-meta">${c.age} anos • ${c.segment}</div>
              </div>
            </div>
          </td>
          <td class="text-right font-mono">
            <div class="aum-val">${formatCurrency(c.aum)}</div>
            <div class="client-sub-meta">Liquidez ${c.liquidityDays.split(" ")[0]}</div>
          </td>
          <td>
            <span class="profile-pill profile-${c.profile.toLowerCase()}">${c.profile}</span>
          </td>
          <td>
            <div class="mini-alloc-bar" title="RF: ${c.allocation.rendaFixa}% | MM: ${c.allocation.multimercado}% | INT: ${c.allocation.internacional}% | RV: ${c.allocation.rendaVariavel}% | ALT: ${c.allocation.alternativos}%">
              <span style="width:${c.allocation.rendaFixa}%; background:#1E293B"></span>
              <span style="width:${c.allocation.multimercado}%; background:#3B82F6"></span>
              <span style="width:${c.allocation.internacional}%; background:#0D9488"></span>
              <span style="width:${c.allocation.rendaVariavel}%; background:#D97706"></span>
              <span style="width:${c.allocation.alternativos}%; background:#EC0000"></span>
            </div>
            <div class="mini-alloc-caption">
              <span>RF ${formatPct(c.allocation.rendaFixa, 0)}</span>
              <span class="${c.volatileExposure > c.maxVolatileRecommended ? "neg-text font-semibold" : ""}">
                RV+Alt: ${formatPct(c.volatileExposure, 0)}
              </span>
            </div>
          </td>
          <td>
            <div class="risk-meter-cell">
              <div class="risk-meter-labels">
                <span class="font-mono font-semibold">${c.riskScore.toLocaleString("pt-BR")} pts</span>
                <span class="limit-caption">Limite: ${c.riskLimit}</span>
              </div>
              <div class="risk-progress-track">
                <div class="risk-progress-fill ${c.statusCode}" style="width: ${riskRatioPct}%"></div>
                <div class="risk-limit-marker" style="left: ${limitPosPct}%" title="Limite do perfil: ${c.riskLimit} pts"></div>
              </div>
            </div>
          </td>
          <td class="text-right font-mono">
            <div class="return-val ${c.cdiRatio >= 100 ? "pos-text" : "neg-text"}">${formatPct(c.return12m, 2)}</div>
            <div class="cdi-ratio-sub ${c.cdiRatio >= 100 ? "pos-text" : "neg-text"}">${formatPct(c.cdiRatio, 1)} do CDI</div>
          </td>
          <td>
            <span class="status-badge ${c.statusCode}">
              <span class="status-dot"></span>
              ${c.status}
            </span>
          </td>
          <td class="text-right" onclick="event.stopPropagation()">
            <div class="row-actions">
              <button class="btn-row-icon" title="Analisar Carteira" onclick="window.SPC.App.selectClient('${c.id}', true)">
                Analisar
              </button>
              <button class="btn-row-icon report" title="Relatório Executivo para o Cliente" onclick="window.SPC.App.openPresentationModal('${c.id}')">
                Relatório
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function getInitials(name) {
    const clean = (name || "Cliente").replace(/Dra\.|Dr\.|Grupo|Familiar/gi, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Seleciona um cliente e atualiza a visão detalhada, os gráficos e o Plano de Ação
   */
  function selectClient(clientId, scrollToDetail = false) {
    const found = state.clients.find((c) => c.id === clientId);
    if (!found) return;
    state.selectedClientId = found.id;
    renderClientTable();
    renderSelectedClientDetail();

    if (scrollToDetail) {
      const detailSection = document.getElementById("client-detail-workspace");
      if (detailSection) {
        detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  /**
   * B.3 & C Renderiza Visão Detalhada do Cliente Selecionado + Gráficos + Plano de Ação Automatizado
   */
  function renderSelectedClientDetail() {
    const client = getSelectedClient();
    if (!client) return;

    // Cabeçalho do Cliente Selecionado
    const nameEl = document.getElementById("detail-client-name");
    const idEl = document.getElementById("detail-client-id");
    const metaEl = document.getElementById("detail-client-meta");
    const statusEl = document.getElementById("detail-client-status");
    const notesEl = document.getElementById("detail-client-notes");

    if (nameEl) nameEl.textContent = client.name;
    if (idEl) idEl.textContent = client.id;
    if (metaEl) {
      metaEl.innerHTML = `
        <span><strong>Patrimônio (AuM):</strong> ${formatCurrency(client.aum)}</span>
        <span class="meta-sep">•</span>
        <span><strong>Perfil:</strong> ${client.profile}</span>
        <span class="meta-sep">•</span>
        <span><strong>Idade:</strong> ${client.age} anos</span>
        <span class="meta-sep">•</span>
        <span><strong>Liquidez:</strong> ${client.liquidityDays}</span>
        <span class="meta-sep">•</span>
        <span><strong>Private Banker:</strong> ${client.banker}</span>
      `;
    }
    if (statusEl) {
      statusEl.className = `status-badge large ${client.statusCode}`;
      statusEl.innerHTML = `<span class="status-dot"></span> ${client.status}`;
    }
    if (notesEl) {
      notesEl.textContent = client.notes || "";
    }

    // Mini KPIs do Cliente Selecionado
    setText("detail-kpi-aum", formatCurrency(client.aum));
    setText("detail-kpi-risk", `${client.riskScore.toLocaleString("pt-BR")} / ${client.riskLimit}`);
    setText(
      "detail-kpi-volatile",
      `${formatPct(client.volatileExposure, 0)} (Teto ${client.maxVolatileRecommended}%)`
    );
    setText(
      "detail-kpi-return",
      `${formatPct(client.return12m, 2)} (${formatPct(client.cdiRatio, 1)} CDI)`
    );

    // Botão de Simular / Restaurar Rebalanceamento
    const btnRebalance = document.getElementById("btn-apply-rebalance");
    const btnResetRebalance = document.getElementById("btn-reset-rebalance");
    const orig = state.originalAllocations[client.id];
    const isModified =
      orig &&
      JSON.stringify(orig.allocation) !== JSON.stringify(client.allocation);

    if (btnRebalance) {
      if (client.statusCode === "ok" && isModified) {
        btnRebalance.innerHTML = "✓ Carteira Rebalanceada e Enquadrada";
        btnRebalance.classList.add("applied");
      } else {
        btnRebalance.innerHTML = "⚡ Aplicar Alocação Recomendada Ideal";
        btnRebalance.classList.remove("applied");
      }
    }
    if (btnResetRebalance) {
      btnResetRebalance.classList.toggle("hidden", !isModified);
    }

    // Renderiza Tabela Comparativa de Alocação + Sliders What-If
    renderAllocationComparisonTable(client);

    // Renderiza Gráficos Interativos Chart.js
    renderAllocationChart(client);
    renderPerformanceChart(client);

    // C. Renderiza Plano de Ação Automatizado
    renderAutomatedActionPlan(client);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /**
   * Tabela Comparativa de Alocação Atual vs. Recomendada Ideal
   */
  function renderAllocationComparisonTable(client) {
    const tbody = document.getElementById("allocation-comparison-tbody");
    if (!tbody) return;

    tbody.innerHTML = client.actionPlan.classes
      .map((cls) => {
        const diffClass =
          cls.diffPct > 0.5 ? "pos-text" : cls.diffPct < -0.5 ? "neg-text" : "muted-text";
        const diffSign = cls.diffPct > 0 ? "+" : "";

        return `
        <tr>
          <td>
            <div class="asset-class-cell">
              <span class="asset-color-dot" style="background:${cls.color}"></span>
              <div>
                <div class="asset-name">${cls.label}</div>
                <div class="asset-sub">${formatCurrency(cls.currentValue)}</div>
              </div>
            </div>
          </td>
          <td class="text-right font-mono font-semibold">${formatPct(cls.currentPct, 1)}</td>
          <td class="text-right font-mono">${formatPct(cls.targetPct, 1)}</td>
          <td class="text-right font-mono ${diffClass}">
            ${Math.abs(cls.diffPct) < 0.5 ? "Alinhado" : `${diffSign}${formatPct(cls.diffPct, 1)}`}
          </td>
          <td class="text-right font-mono ${diffClass}">
            ${
              Math.abs(cls.diffPct) < 0.5
                ? "—"
                : `${diffSign}${formatCurrency(cls.diffValue)}`
            }
          </td>
        </tr>
      `;
      })
      .join("");
  }

  /**
   * Gráfico 1: Alocação Atual vs. Alocação Recomendada Ideal (Chart.js)
   */
  function renderAllocationChart(client) {
    const canvas = document.getElementById("chart-allocation");
    if (!canvas || typeof Chart === "undefined") return;

    if (state.charts.allocation) {
      state.charts.allocation.destroy();
    }

    const labels = window.SPC.ASSET_CLASSES.map((c) => c.shortLabel);
    const currentData = window.SPC.ASSET_CLASSES.map((c) => client.allocation[c.key] || 0);
    const targetData = window.SPC.ASSET_CLASSES.map((c) => client.targetAllocation[c.key] || 0);

    const isRadar = state.allocationChartType === "radar";

    state.charts.allocation = new Chart(canvas.getContext("2d"), {
      type: isRadar ? "radar" : "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Alocação Atual (%)",
            data: currentData,
            backgroundColor: isRadar ? "rgba(236, 0, 0, 0.18)" : "#EC0000",
            borderColor: "#EC0000",
            borderWidth: 2,
            borderRadius: isRadar ? 0 : 5,
            barPercentage: 0.72,
            categoryPercentage: 0.7
          },
          {
            label: `Recomendada Ideal — ${client.profile} (%)`,
            data: targetData,
            backgroundColor: isRadar ? "rgba(30, 41, 59, 0.15)" : "#1E293B",
            borderColor: "#1E293B",
            borderWidth: 2,
            borderRadius: isRadar ? 0 : 5,
            barPercentage: 0.72,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { family: "'Inter', sans-serif", size: 12, weight: "600" },
              color: "#334155"
            }
          },
          tooltip: {
            backgroundColor: "#0F172A",
            titleFont: { family: "'Inter', sans-serif", size: 13, weight: "700" },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 12,
            callbacks: {
              label: function (ctx) {
                const pct = ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed.r;
                const valReais = (pct / 100) * client.aum;
                return ` ${ctx.dataset.label.split(" (")[0]}: ${formatPct(pct, 1)} (${formatCurrency(valReais)})`;
              }
            }
          }
        },
        scales: isRadar
          ? {
              r: {
                beginAtZero: true,
                SuggestedMax: 85,
                ticks: { stepSize: 20, callback: (v) => v + "%" },
                pointLabels: { font: { family: "'Inter', sans-serif", size: 11, weight: "600" } }
              }
            }
          : {
              y: {
                beginAtZero: true,
                max: 90,
                grid: { color: "#E2E8F0" },
                ticks: {
                  font: { family: "'Inter', sans-serif", size: 11 },
                  callback: (v) => v + "%"
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  font: { family: "'Inter', sans-serif", size: 11, weight: "600" },
                  color: "#334155"
                }
              }
            }
      }
    });
  }

  /**
   * Gráfico 2: Rentabilidade Acumulada 12 Meses (% Carteira vs. % CDI)
   */
  function renderPerformanceChart(client) {
    const canvas = document.getElementById("chart-performance");
    if (!canvas || typeof Chart === "undefined") return;

    if (state.charts.performance) {
      state.charts.performance.destroy();
    }

    const labels = window.SPC.MONTH_LABELS;
    const clientCurve = client.monthlyCumulative;
    const cdiCurve = window.SPC.CDI_CUMULATIVE_12M;

    state.charts.performance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `Carteira ${client.name.split(" ")[0]} (${formatPct(client.return12m, 2)})`,
            data: clientCurve,
            borderColor: client.cdiRatio >= 100 ? "#0D9488" : "#EC0000",
            backgroundColor:
              client.cdiRatio >= 100 ? "rgba(13, 148, 136, 0.10)" : "rgba(236, 0, 0, 0.08)",
            borderWidth: 2.8,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.32
          },
          {
            label: `Benchmark CDI (${formatPct(client.cdi12m, 2)})`,
            data: cdiCurve,
            borderColor: "#475569",
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 2,
            fill: false,
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: { family: "'Inter', sans-serif", size: 12, weight: "600" },
              color: "#334155"
            }
          },
          tooltip: {
            backgroundColor: "#0F172A",
            padding: 12,
            callbacks: {
              label: function (ctx) {
                return ` ${ctx.dataset.label.split(" (")[0]}: ${formatPct(ctx.parsed.y, 2)} acum.`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "#E2E8F0" },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 },
              callback: (v) => v.toLocaleString("pt-BR") + "%"
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 }
            }
          }
        }
      }
    });
  }

  /**
   * C. Renderiza o Plano de Ação Automatizado ("O que fazer com as informações")
   */
  function renderAutomatedActionPlan(client) {
    const plan = client.actionPlan;

    setText("action-diagnosis-title", plan.diagnosisTitle);
    setText("action-diagnosis-text", plan.diagnosisText);
    setText("action-recommendation-text", plan.recommendationText);
    setText("action-justification-text", plan.macroJustification);

    const diagCard = document.getElementById("action-card-diagnosis");
    if (diagCard) {
      diagCard.className = `action-pillar-card status-border-${client.statusCode}`;
    }

    // Renderiza pílulas de ordens práticas (Boleta de Rebalanceamento Sugerida)
    const ordersContainer = document.getElementById("action-orders-list");
    if (ordersContainer) {
      const actionable = plan.classes.filter((c) => Math.abs(c.diffPct) >= 1);
      if (actionable.length === 0) {
        ordersContainer.innerHTML = `
          <div class="order-ticket aligned">
            <span class="order-badge hold">MANTER CARTEIRA</span>
            <span>Alocação atual 100% aderente ao Modelo Estratégico Santander Private (${client.profile}).</span>
          </div>
        `;
      } else {
        ordersContainer.innerHTML = actionable
          .map(
            (item) => `
          <div class="order-ticket ${item.diffPct < 0 ? "sell" : "buy"}">
            <div class="order-left">
              <span class="order-badge ${item.diffPct < 0 ? "sell" : "buy"}">
                ${item.diffPct < 0 ? "REDUZIR / VENDER" : "ALOCAR / COMPRAR"}
              </span>
              <span class="order-asset">${item.fullLabel}</span>
            </div>
            <div class="order-right font-mono">
              <span class="order-pct">${item.diffPct > 0 ? "+" : ""}${formatPct(item.diffPct, 0)}</span>
              <span class="order-val">${item.diffPct > 0 ? "+" : "-"}${formatCurrency(Math.abs(item.diffValue))}</span>
            </div>
          </div>
        `
          )
          .join("");
      }
    }
  }

  /**
   * Aplica a Alocação Recomendada Ideal ao cliente selecionado (Simulação de Rebalanceamento ao Vivo)
   */
  function applyRecommendedAllocation(clientId) {
    const targetId = clientId || state.selectedClientId;
    const idx = state.clients.findIndex((c) => c.id === targetId);
    if (idx === -1) return;

    const current = state.clients[idx];
    const model = window.SPC.MODEL_PORTFOLIOS[current.profile];
    if (!model) return;

    const updatedRaw = {
      ...current,
      allocation: { ...model.allocation },
      // Simula impacto esperado de melhoria gradual no retorno ajustado ao risco
      return12m: Math.max(current.return12m, Math.round(current.cdi12m * (model.targetCdiRatio / 100) * 100) / 100),
      notes: `${current.notes.replace(/ \[Rebalanceamento.*\]/g, "")} [Rebalanceamento estratégico aplicado pelo Advisor no Cockpit]`
    };

    state.clients[idx] = enrichClient(updatedRaw);
    state.selectedClientId = targetId;
    renderAll();
    showToast(`Rebalanceamento aplicado! ${current.name} agora está com status "Enquadrado".`);
  }

  /**
   * Restaura a alocação original do cliente antes da simulação
   */
  function resetClientAllocation() {
    const client = getSelectedClient();
    if (!client) return;
    const orig = state.originalAllocations[client.id];
    if (!orig) return;

    const idx = state.clients.findIndex((c) => c.id === client.id);
    if (idx === -1) return;

    const restored = enrichClient({
      ...client,
      allocation: { ...orig.allocation },
      return12m: orig.return12m,
      notes: client.notes.replace(/ \[Rebalanceamento.*\]/g, "")
    });

    state.clients[idx] = restored;
    renderAll();
    showToast(`Alocação original de ${client.name} restaurada.`);
  }

  /**
   * D. Assistente de IA Integrado (Advisor Copilot)
   */
  function initCopilotWelcome() {
    const chatBox = document.getElementById("copilot-messages");
    if (!chatBox) return;

    const kpis = calculateDashboardKPIs(state.clients);
    chatBox.innerHTML = `
      <div class="chat-msg assistant">
        <div class="msg-avatar">AI</div>
        <div class="msg-bubble">
          <div class="msg-sender">Santander Advisor Copilot</div>
          <p>Olá! Estou conectado em tempo real à sua base de <strong>${kpis.totalClients} clientes Private</strong> (AuM total de <strong>${formatCurrency(kpis.totalAum)}</strong>).</p>
          <p>Detectei <strong class="neg-text">${kpis.dangerCount} carteiras em Desenquadramento (Alto Risco)</strong> e <strong>${kpis.warningCount} em zona de Atenção</strong> frente ao cenário atual de juros (CDI 11,25% a.a.) e câmbio (R$ 5,74).</p>
          <p class="copilot-tip">Selecione um atalho abaixo ou faça uma pergunta sobre qualquer cliente, ativo ou cenário:</p>
        </div>
      </div>
    `;
  }

  function sendQuickPrompt(promptText) {
    const input = document.getElementById("copilot-input");
    if (input) input.value = promptText;
    handleCopilotSubmit();
  }

  function handleCopilotSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("copilot-input");
    const chatBox = document.getElementById("copilot-messages");
    if (!input || !chatBox) return;

    const text = input.value.trim();
    if (!text) return;

    // Adiciona mensagem do Advisor
    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user";
    userMsg.innerHTML = `
      <div class="msg-bubble">
        <div class="msg-sender">Private Advisor</div>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    chatBox.appendChild(userMsg);
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Resposta dinâmica do Copilot lendo os dados reais do estado
    const selected = getSelectedClient();
    const responseHtml = window.SPC.Copilot.generateResponse(text, state.clients, selected);

    const botMsg = document.createElement("div");
    botMsg.className = "chat-msg assistant";
    botMsg.innerHTML = `
      <div class="msg-avatar">AI</div>
      <div class="msg-bubble">
        <div class="msg-sender">Santander Advisor Copilot</div>
        ${responseHtml}
      </div>
    `;
    chatBox.appendChild(botMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * E. Gerador de Relatório Executivo ("Apresentar para o Cliente")
   * Abre o Modo Apresentação Limpo e Consultivo (Imprimível em PDF)
   */
  function openPresentationModal(clientId) {
    if (clientId) {
      selectClient(clientId, false);
    }
    const client = getSelectedClient();
    if (!client) return;

    const modal = document.getElementById("presentation-modal");
    if (!modal) return;

    // Popula seletor de clientes dentro do modo apresentação
    const selector = document.getElementById("presentation-client-select");
    if (selector) {
      selector.innerHTML = state.clients
        .map(
          (c) =>
            `<option value="${c.id}" ${c.id === client.id ? "selected" : ""}>${c.name} (${c.profile} • ${formatCurrency(c.aum)})</option>`
        )
        .join("");
    }

    populatePresentationContent(client);
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Renderiza os gráficos do modo apresentação após o modal estar visível
    setTimeout(() => {
      renderPresentationCharts(client);
    }, 60);
  }

  function closePresentationModal() {
    const modal = document.getElementById("presentation-modal");
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function populatePresentationContent(client) {
    const plan = client.actionPlan;
    const model = window.SPC.MODEL_PORTFOLIOS[client.profile];
    const nowStr = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    setText("pres-date", `Estudo Patrimonial Executivo • ${nowStr}`);
    setText("pres-client-name", client.name);
    setText("pres-client-code", `Código Private: ${client.id} • Segmento: ${client.segment}`);
    setText("pres-banker-name", client.banker);
    setText("pres-profile-badge", `Mandato ${client.profile}`);

    // Cards Executivos do Relatório
    setText("pres-kpi-aum", formatCurrency(client.aum, false));
    setText("pres-kpi-return", `${formatPct(client.return12m, 2)} a.a.`);
    setText("pres-kpi-cdi-ratio", `${formatPct(client.cdiRatio, 1)} do CDI no período`);
    setText("pres-kpi-target-cdi", `${model.targetCdiRatio}% do CDI`);
    setText("pres-kpi-target-vol", `Volatilidade Alvo: ${model.expectedVol}`);

    // Textos Consultivos (sem alertas internos do banco)
    setText("pres-executive-headline", plan.clientFacingHeadline);
    setText("pres-executive-summary", plan.clientFacingSummary);
    setText("pres-macro-scenario", plan.macroJustification);
    setText("pres-model-description", model.description);

    // Tabela de Realocação Estratégica Explicada de Forma Clara
    const tbody = document.getElementById("pres-reallocation-tbody");
    if (tbody) {
      tbody.innerHTML = plan.classes
        .map((cls) => {
          const isIncrease = cls.diffPct > 0.5;
          const isDecrease = cls.diffPct < -0.5;
          const movementBadge = isIncrease
            ? `<span class="pres-move-pill add">Elevar Exposição (+${formatPct(cls.diffPct, 0)})</span>`
            : isDecrease
            ? `<span class="pres-move-pill reduce">Realizar / Reduzir (${formatPct(cls.diffPct, 0)})</span>`
            : `<span class="pres-move-pill hold">Posição Calibrada</span>`;

          const strategicObjective = getConsultativeBenefitForClass(cls.key, isIncrease, isDecrease);

          return `
          <tr>
            <td>
              <strong>${cls.fullLabel}</strong>
            </td>
            <td class="text-right font-mono">
              <div>${formatPct(cls.currentPct, 1)}</div>
              <div class="pres-sub-val">${formatCurrency(cls.currentValue)}</div>
            </td>
            <td class="text-right font-mono">
              <div><strong>${formatPct(cls.targetPct, 1)}</strong></div>
              <div class="pres-sub-val">${formatCurrency(cls.targetValue)}</div>
            </td>
            <td>${movementBadge}</td>
            <td class="text-right font-mono">
              ${
                Math.abs(cls.diffPct) < 0.5
                  ? "Manutenção"
                  : `${cls.diffPct > 0 ? "+" : "-"}${formatCurrency(Math.abs(cls.diffValue))}`
              }
            </td>
            <td class="pres-benefit-col">${strategicObjective}</td>
          </tr>
        `;
        })
        .join("");
    }
  }

  function getConsultativeBenefitForClass(key, isIncrease, isDecrease) {
    if (key === "rendaFixa") {
      return isIncrease
        ? "Capturar taxas reais históricas (NTN-B IPCA+ e Pós-Fixados AAA) com elevada liquidez e proteção."
        : "Manter colchão de liquidez soberana e previsibilidade de caixa.";
    }
    if (key === "multimercado") {
      return "Diversificação descorrelacionada via gestores Macro e Quantitativos selecionados.";
    }
    if (key === "internacional") {
      return isIncrease
        ? "Proteção cambial em moeda forte (USD) e acesso a líderes globais de tecnologia e saúde."
        : "Preservar parcela estrutural dolarizada como seguro patrimonial.";
    }
    if (key === "rendaVariavel") {
      return isDecrease
        ? "Reduzir exposição a oscilações cíclicas domésticas em ambiente de juros restritivos."
        : "Participação seletiva em empresas pagadoras de dividendos e alta geração de caixa.";
    }
    if (key === "alternativos") {
      return isDecrease
        ? "Destravar liquidez e eliminar risco assimétrico de crédito estruturado/ativos voláteis."
        : "Prêmio de iliquidez calibrado dentro do orçamento de risco do mandato.";
    }
    return "Otimização da fronteira eficiente de risco-retorno.";
  }

  function renderPresentationCharts(client) {
    if (typeof Chart === "undefined") return;

    const currCanvas = document.getElementById("pres-chart-current");
    const targCanvas = document.getElementById("pres-chart-target");
    const perfCanvas = document.getElementById("pres-chart-performance");

    const labels = window.SPC.ASSET_CLASSES.map((c) => c.shortLabel);
    const colors = window.SPC.ASSET_CLASSES.map((c) => c.color);
    const currentData = window.SPC.ASSET_CLASSES.map((c) => client.allocation[c.key] || 0);
    const targetData = window.SPC.ASSET_CLASSES.map((c) => client.targetAllocation[c.key] || 0);

    if (currCanvas) {
      if (state.charts.reportCurrent) state.charts.reportCurrent.destroy();
      state.charts.reportCurrent = new Chart(currCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data: currentData,
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: "#FFFFFF"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { family: "'Inter', sans-serif", size: 11 } }
            }
          }
        }
      });
    }

    if (targCanvas) {
      if (state.charts.reportTarget) state.charts.reportTarget.destroy();
      state.charts.reportTarget = new Chart(targCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data: targetData,
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: "#FFFFFF"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { family: "'Inter', sans-serif", size: 11 } }
            }
          }
        }
      });
    }

    if (perfCanvas) {
      if (state.charts.reportPerformance) state.charts.reportPerformance.destroy();
      state.charts.reportPerformance = new Chart(perfCanvas.getContext("2d"), {
        type: "line",
        data: {
          labels: window.SPC.MONTH_LABELS,
          datasets: [
            {
              label: `Portfólio Atual (${formatPct(client.return12m, 2)})`,
              data: client.monthlyCumulative,
              borderColor: "#0F172A",
              backgroundColor: "rgba(15, 23, 42, 0.08)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.3
            },
            {
              label: `CDI Acumulado (${formatPct(client.cdi12m, 2)})`,
              data: window.SPC.CDI_CUMULATIVE_12M,
              borderColor: "#EC0000",
              borderDash: [5, 4],
              borderWidth: 2,
              fill: false,
              tension: 0.25
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { boxWidth: 10, font: { family: "'Inter', sans-serif", size: 11, weight: "600" } }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (v) => v + "%" }
            }
          }
        }
      });
    }
  }

  /**
   * Filtros Rápidos e Upload de Arquivo CSV / JSON
   */
  function setRiskFilter(filterVal) {
    state.filterStatus = filterVal;
    document.querySelectorAll("[data-risk-filter]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-risk-filter") === filterVal);
    });
    renderClientTable();
  }

  function handleFileUpload(file, mode = "merge") {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const content = evt.target.result;
        const importedClients = parseImportedFile(content, file.name);
        if (!importedClients || importedClients.length === 0) {
          showToast("Nenhum registro válido encontrado no arquivo.", true);
          return;
        }

        importedClients.forEach((c) => {
          state.originalAllocations[c.id] = {
            allocation: { ...c.allocation },
            return12m: c.return12m
          };
        });

        if (mode === "replace") {
          state.clients = importedClients;
        } else {
          // Mescla atualizando por ID ou adicionando novos
          const map = new Map(state.clients.map((c) => [c.id, c]));
          importedClients.forEach((c) => map.set(c.id, c));
          state.clients = Array.from(map.values());
        }

        state.selectedClientId = importedClients[0].id;
        closeUploadModal();
        renderAll();
        initCopilotWelcome();
        showToast(
          `Base atualizada com sucesso! ${importedClients.length} clientes importados de "${file.name}".`
        );
      } catch (err) {
        showToast(`Erro ao processar arquivo: ${err.message}`, true);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  /**
   * Faz download de arquivo modelo CSV ou da base atual
   */
  function downloadSampleCSV() {
    const sampleCsv = [
      "id;nome;idade;patrimonio;perfil;renda_fixa;multimercado;renda_variavel;internacional;alternativos;rentabilidade_12m;cdi_12m",
      "PB-2010;Família Andrade Camargo;62;38500000;Conservador;52;14;18;6;10;8.40;11.25",
      "PB-2015;Dr. Ricardo Albuquerque;47;21000000;Moderado;30;18;25;7;20;7.85;11.25",
      "PB-2022;Sofia Mendes Valladares;54;49000000;Moderado;55;20;10;10;5;12.90;11.25",
      "PB-2030;Leonardo & Clara Prado;39;16800000;Arrojado;15;16;34;12;23;9.45;11.25"
    ].join("\n");

    triggerDownload(sampleCsv, "modelo_clientes_santander_private.csv", "text/csv;charset=utf-8;");
    showToast("Modelo CSV baixado! Você pode editá-lo e importar no Cockpit.");
  }

  function downloadCurrentDatabaseCSV() {
    const csv = exportClientsToCSV(state.clients);
    triggerDownload(csv, "carteira_clientes_santander_private.csv", "text/csv;charset=utf-8;");
    showToast("Base consolidada exportada em CSV com sucesso.");
  }

  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob(["\uFEFF" + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function openUploadModal() {
    const modal = document.getElementById("upload-modal");
    if (modal) modal.classList.remove("hidden");
  }

  function closeUploadModal() {
    const modal = document.getElementById("upload-modal");
    if (modal) modal.classList.add("hidden");
  }

  /**
   * Toast de Feedback Executivo
   */
  function showToast(message, isError = false) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-item ${isError ? "error" : "success"}`;
    toast.innerHTML = `
      <span class="toast-dot"></span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  /**
   * Registro de todos os Event Listeners da Interface
   */
  function bindEvents() {
    // Botões de filtro de risco
    document.querySelectorAll("[data-risk-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setRiskFilter(btn.getAttribute("data-risk-filter"));
      });
    });

    // Seletor de perfil
    const profileSelect = document.getElementById("filter-profile-select");
    if (profileSelect) {
      profileSelect.addEventListener("change", (e) => {
        state.filterProfile = e.target.value;
        renderClientTable();
      });
    }

    // Busca textual de clientes
    const searchInput = document.getElementById("client-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderClientTable();
      });
    }

    // Alternar tipo de gráfico de alocação (Barras vs Radar)
    document.querySelectorAll("[data-chart-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.allocationChartType = btn.getAttribute("data-chart-type");
        document.querySelectorAll("[data-chart-type]").forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        const client = getSelectedClient();
        if (client) renderAllocationChart(client);
      });
    });

    // Botão Aplicar Rebalanceamento Recomendado
    const btnApplyRebalance = document.getElementById("btn-apply-rebalance");
    if (btnApplyRebalance) {
      btnApplyRebalance.addEventListener("click", () => {
        applyRecommendedAllocation();
      });
    }

    // Botão Restaurar Alocação Original
    const btnResetRebalance = document.getElementById("btn-reset-rebalance");
    if (btnResetRebalance) {
      btnResetRebalance.addEventListener("click", () => {
        resetClientAllocation();
      });
    }

    // Botões de Gerar Apresentação / Relatório Executivo
    const btnOpenPresTop = document.getElementById("btn-open-presentation-top");
    const btnOpenPresDetail = document.getElementById("btn-open-presentation-detail");
    if (btnOpenPresTop) {
      btnOpenPresTop.addEventListener("click", () => openPresentationModal());
    }
    if (btnOpenPresDetail) {
      btnOpenPresDetail.addEventListener("click", () => openPresentationModal());
    }

    // Fechar Modo Apresentação e Trocar Cliente dentro do Relatório
    const btnClosePres = document.getElementById("btn-close-presentation");
    if (btnClosePres) {
      btnClosePres.addEventListener("click", closePresentationModal);
    }

    const presClientSelect = document.getElementById("presentation-client-select");
    if (presClientSelect) {
      presClientSelect.addEventListener("change", (e) => {
        const newId = e.target.value;
        selectClient(newId, false);
        const c = getSelectedClient();
        if (c) {
          populatePresentationContent(c);
          renderPresentationCharts(c);
        }
      });
    }

    // Botão Imprimir / Exportar PDF no Modo Apresentação
    const btnPrintPres = document.getElementById("btn-print-presentation");
    if (btnPrintPres) {
      btnPrintPres.addEventListener("click", () => {
        window.print();
      });
    }

    // Formulário do Advisor Copilot
    const copilotForm = document.getElementById("copilot-form");
    if (copilotForm) {
      copilotForm.addEventListener("submit", handleCopilotSubmit);
    }

    // Prompts rápidos do Copilot
    document.querySelectorAll("[data-quick-prompt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        sendQuickPrompt(btn.getAttribute("data-quick-prompt"));
      });
    });

    // Modal de Upload CSV / JSON
    const btnOpenUpload = document.getElementById("btn-open-upload");
    const btnCloseUpload = document.getElementById("btn-close-upload");
    const fileInput = document.getElementById("file-upload-input");
    const dropzone = document.getElementById("upload-dropzone");

    if (btnOpenUpload) btnOpenUpload.addEventListener("click", openUploadModal);
    if (btnCloseUpload) btnCloseUpload.addEventListener("click", closeUploadModal);

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        const modeEl = document.querySelector('input[name="import-mode"]:checked');
        const mode = modeEl ? modeEl.value : "merge";
        if (file) handleFileUpload(file, mode);
        fileInput.value = "";
      });
    }

    if (dropzone) {
      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });
      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
      });
      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        const modeEl = document.querySelector('input[name="import-mode"]:checked');
        const mode = modeEl ? modeEl.value : "merge";
        if (file) handleFileUpload(file, mode);
      });
    }

    // Botão de carregar base de demonstração extra no modal de upload
    const btnLoadSampleBatch = document.getElementById("btn-load-sample-batch");
    if (btnLoadSampleBatch) {
      btnLoadSampleBatch.addEventListener("click", () => {
        const sampleCsv = [
          "id;nome;idade;patrimonio;perfil;renda_fixa;multimercado;renda_variavel;internacional;alternativos;rentabilidade_12m;cdi_12m",
          "PB-2010;Família Andrade Camargo;62;38500000;Conservador;52;14;18;6;10;8.40;11.25",
          "PB-2015;Dr. Ricardo Albuquerque;47;21000000;Moderado;30;18;25;7;20;7.85;11.25",
          "PB-2022;Sofia Mendes Valladares;54;49000000;Moderado;55;20;10;10;5;12.90;11.25"
        ].join("\n");
        const imported = parseImportedFile(sampleCsv, "lote_adicional.csv");
        imported.forEach((c) => {
          state.originalAllocations[c.id] = {
            allocation: { ...c.allocation },
            return12m: c.return12m
          };
        });
        const map = new Map(state.clients.map((c) => [c.id, c]));
        imported.forEach((c) => map.set(c.id, c));
        state.clients = Array.from(map.values());
        state.selectedClientId = imported[0].id;
        closeUploadModal();
        renderAll();
        initCopilotWelcome();
        showToast("3 novos clientes Private importados com sucesso para a base ativa!");
      });
    }

    // Botão Restaurar Base Inicial
    const btnResetDatabase = document.getElementById("btn-reset-database");
    if (btnResetDatabase) {
      btnResetDatabase.addEventListener("click", () => {
        loadInitialClients();
        renderAll();
        initCopilotWelcome();
        showToast("Base de dados inicial (10 clientes Private) restaurada.");
      });
    }
  }

  return {
    init,
    selectClient,
    openPresentationModal,
    closePresentationModal,
    applyRecommendedAllocation,
    sendQuickPrompt,
    handleNewsAction,
    simulateMarketTick,
    downloadSampleCSV,
    downloadCurrentDatabaseCSV
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.SPC.App.init();
});
