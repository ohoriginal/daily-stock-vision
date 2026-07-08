
## Visão geral

Vamos construir um sistema de controle de estoque **MM IRAU'CELL** inspirado no ira-stock-buddy, com todas as suas melhorias. Tudo salvo **localmente no aparelho** (localStorage), sem login, funcionando offline. Layout responsivo (celular e computador).

## Estrutura de páginas

- `/` — **Painel**: resumo (produtos, estoque, vendas/compras do mês, lucro do mês, valor total do estoque) + atalhos + alertas de estoque baixo.
- `/produtos` — lista, busca, filtro por categoria/status, cadastro com **quantidade ideal** e **limite de alerta**.
- `/compras` — registrar entradas de mercadoria.
- `/vendas` — registrar vendas, gerar recibo e enviar por WhatsApp.
- `/clientes` — cadastro + histórico de compras por cliente.
- `/movimentacao` — **nova aba**: entradas/saídas por semana, mês e ano, com gráficos separados de **Faturamento**, **Lucro** e **Pagamentos**.
- `/relatorios` — relatórios detalhados para Receita Federal (escolher formato na hora do download).
- `/config` — tema (Preto+Dourado ↔ Branco+Preto), backup/restaurar JSON.

## Regra de cor do estoque (por produto)

Baseado em `estoque_atual / quantidade_ideal`:

- ≥ 100% → **verde**
- ≥ 70% e < 100% → **azul**
- ≥ 50% e < 70% → **lilás**
- ≥ limite de alerta e < 50% → **amarelo/laranja** (transição)
- ≤ 15% ou abaixo do limite de alerta → **vermelho** + mensagem de alerta destacada no Painel

Cada produto guarda: nome, categoria, custo, preço, estoque atual, **quantidade ideal**, **limite de alerta** (padrão 15%).

## Movimentação (semana / mês / ano)

Abas com seletor de período. Três cartões/gráficos independentes:

1. **Faturamento** (soma das vendas)
2. **Lucro** (vendas − custo dos produtos vendidos)
3. **Pagamentos** (compras/despesas)

Gráfico de linha ou barra usando **Recharts**, com listagem detalhada abaixo.

## Relatórios para Receita Federal

Tela com filtros de período (data inicial/final). Ao clicar em "Baixar", o usuário escolhe o formato na hora:

- **PDF detalhado** (jsPDF): capa, resumo, tabelas de vendas, compras, totais, imposto estimado.
- **CSV / Excel** (SheetJS): planilha com todas as movimentações.
- **Livro Caixa simplificado** (PDF): entradas e saídas linha a linha, estilo MEI.

Todos com CNPJ/nome do negócio (configurável em `/config`).

## Recibo por WhatsApp

Após finalizar uma venda:
- Gera **recibo em imagem PNG** (html2canvas) e também **PDF** (jsPDF).
- Botão **"Enviar por WhatsApp"** usa a Web Share API do celular (`navigator.share` com o arquivo) para abrir o WhatsApp com o recibo já anexado.
- Fallback: baixa o arquivo + abre `wa.me/?text=...` com resumo em texto.

## Temas

Dois temas alternáveis com um botão:
- **Preto + Dourado** (padrão, como o original)
- **Branco + Preto** (claro, minimalista)

Preferência salva no localStorage. Tokens semânticos em `src/styles.css` (nada de cor hardcoded).

## Backup / Restaurar

Botão em `/config`:
- **Exportar tudo** → baixa `.json` com produtos, vendas, compras, clientes, configs.
- **Importar** → sobrescreve dados a partir de um `.json`.

## Layout responsivo

- Celular: navegação inferior (bottom tabs) como no original.
- Desktop (≥ 1024px): navegação lateral (sidebar) + conteúdo mais largo, cartões em grid.

## Detalhes técnicos

- **Stack**: TanStack Start + React + Tailwind v4 + shadcn/ui + Recharts + jsPDF + html2canvas + SheetJS (xlsx).
- **Storage**: camada única em `src/lib/storage.ts` com hooks (`useProducts`, `useSales`, `useCustomers`, etc.) baseados em localStorage + evento de sincronização.
- **Tema**: classe `.dark` / `.light-gold` no `<html>`; variáveis oklch em `src/styles.css`.
- **WhatsApp share**: `navigator.canShare({ files })` quando disponível; senão, download + `wa.me`.
- **Rotas**: arquivos em `src/routes/` (index, produtos, compras, vendas, clientes, movimentacao, relatorios, config).
- **Sem backend**: nada de Lovable Cloud; nenhuma chave/API externa.

## Sugestões extras que vou incluir (você aprovou)

- Categorias e busca de produtos
- Gráficos de vendas na aba Movimentação
- Backup/restaurar JSON
- Cadastro de clientes com histórico

## Próximos passos

Se aprovar, começo criando o sistema de temas + storage + layout responsivo, depois as páginas na ordem: Produtos → Vendas (com recibo) → Compras → Clientes → Movimentação → Relatórios → Painel.
