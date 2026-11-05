# Santander Private Cockpit

**Sistema de Suporte à Decisão e Enquadramento de Risco para Advisors**

Este projeto foi desenvolvido como um protótipo funcional para demonstrar a aplicação de tecnologia, dados e automação na rotina de Wealth Management (Private Banking). 

O objetivo da aplicação é solucionar o desafio operacional do acompanhamento de carteiras, fornecendo ao Advisor uma visão consolidada e alertas automáticos sobre clientes desenquadrados em relação ao seu perfil de risco, permitindo tomadas de decisão ágeis, estratégicas e baseadas em dados.

## O Problema de Negócio (Business Case)
No segmento Private, o tempo do Advisor deve ser focado totalmente no relacionamento com o cliente. A identificação manual de carteiras com nível de risco incompatível gera ineficiência. O sistema automatiza a leitura dessas distorções e prepara o terreno para as mudanças propostas.

## Principais Funcionalidades

* **Monitor de Enquadramento:** Leitura dinâmica da base de dados e alerta visual automático para clientes com exposição excessiva a ativos de risco ("Desenquadrado - Alto Risco").
* **Radar de Mercado e Contexto Macro:** Ticker de cotações financeiras reais (CDI, Ibovespa, USD, S&P 500) cruzado com um painel de impacto de notícias nas classes de ativos.
* **Advisor Copilot (Integração com IA):** Assistente projetado para conversar com a base de dados carregada, emitindo diagnósticos e sugerindo boletagens de rebalanceamento.
* **Geração de Relatórios Executivos:** Módulo que oculta informações gerenciais internas do banco e compila a recomendação estratégica em um layout limpo, pronto para ser apresentado ou exportado em PDF para o cliente final.

## Tecnologias e Arquitetura
* **Front-end / UI:** HTML5, CSS3, JavaScript.
* **Visualização de Dados:** Chart.js para renderização de gráficos comparativos de alocação patrimonial.
* **Dados:** Estruturação de mock data simulando entidades reais de um banco de dados financeiro.
* **Deploy:** Vercel (Hospedagem em nuvem com alta disponibilidade).

##  Como Acessar o Protótipo
O sistema está em produção e pode ser testado diretamente no navegador através do link abaixo:

🔗 **https://santander-private-cockpit-fjr4msj3t.vercel.app/**

**Dica de Navegação para Avaliação:** 
Para visualizar o fluxo completo de valor do sistema, recomendo selecionar o cliente `Eduardo Vasconcelos & Família (Alerta de Risco)`, acionar o Assistente Copilot para analisar o impacto na carteira e, em seguida, utilizar a função **"Gerar Apresentação / Relatório para o Cliente"** no menu superior.
