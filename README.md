# 💬 FinZap Agent - Assistente Financeiro Pessoal no WhatsApp

Um agente inteligente de finanças pessoais integrado ao **WhatsApp**, com acesso completo ao banco de dados **Supabase** via **LLM Gemini (Google AI)** com *Function Calling*, integrador **Evolution API Go**, arquitetura **Node.js (MVC)** e uma **Interface Web (Dashboard)** simples e moderna.

---

## 🌟 Principais Funcionalidades

1. **Segurança por Número de WhatsApp (Tabela `usuarios`)**:
   - O agente **apenas responde** a mensagens enviadas por números cadastrados e ativos na tabela `usuarios`.
   - Números não autorizados são ignorados para prevenir uso indevido de tokens de LLM.

2. **Agente IA com Function Calling (CRUD Completo no Supabase)**:
   - **Transações**: Registrar despesas, receitas, empréstimos (tomados/concedidos), suporte a compras parceladas (cria parcelas nos meses seguintes).
   - **Consultas & Filtros**: Consultar extrato por período, por categoria ou tipo de pagamento.
   - **Resumos**: Gerar relatórios financeiros mensais (total de receitas, despesas, saldo líquido).
   - **Limites de Gastos**: Definir e verificar tetos de gastos por categoria (com alertas de orçamento).
   - **Categorias**: Listar, criar e deletar categorias diretamente pelo WhatsApp ou pelo Dashboard Web.

3. **Dashboard Web Simples e Elegante**:
   - Interface em modo escuro com gráficos (Chart.js), indicadores de receitas/despesas/saldo, visualização de limites com barras de progresso e cadastro de novos usuários autorizados.

---

## 📁 Estrutura do Projeto (MVC)

```
finzap-agent/
├── src/
│   ├── app.js                 # Configuração do Express e Middlewares
│   ├── server.js              # Inicialização do servidor HTTP
│   ├── config/                # Módulos de conexão (Supabase, Gemini, Evolution API)
│   │   ├── supabase.js
│   │   ├── gemini.js
│   │   └── evolution.js
│   ├── controllers/           # Controllers do MVC
│   │   ├── webhookController.js   # Recebe e valida webhooks do WhatsApp
│   │   ├── apiController.js       # APIs REST para o Dashboard Web
│   │   └── dashboardController.js # Renderização das views EJS
│   ├── services/              # Regras de Negócio e Serviços
│   │   ├── supabaseService.js     # CRUD no banco de dados Supabase
│   │   ├── geminiAgentService.js  # Lógica do Agente Gemini + Function Calling Loop
│   │   └── whatsappService.js     # Envio/Recepção via Evolution API Go
│   ├── tools/                 # Ferramentas do Agente Gemini
│   │   └── agentTools.js          # Definição e execução das funções Supabase
│   ├── routes/                # Definição de Rotas
│   │   ├── webhookRoutes.js
│   │   ├── apiRoutes.js
│   │   └── viewRoutes.js
│   ├── views/                 # Templates EJS (Dashboard & Gestão de Usuários)
│   │   ├── index.ejs
│   │   └── usuarios.ejs
│   └── public/                # Arquivos estáticos (CSS, JS, imagens)
│       ├── css/style.css
│       └── js/dashboard.js
├── .env.example
├── package.json
└── README.md
```

---

## 🛠️ Configuração e Instalação

### 1. Clonar e Instalar Dependências

```bash
cd finzap-agent
npm install
```

### 2. Configurar Variáveis de Ambiente (.env)

Crie o arquivo `.env` na raiz baseado no `.env.example`:

```env
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-ou-anon

# Evolution API Go
EVOLUTION_API_URL=https://evogo.medainer.com.br
EVOLUTION_API_KEY=sua-chave-global-ou-da-instancia
EVOLUTION_INSTANCE_NAME=nome-da-sua-instancia

# Gemini AI (LLM)
GEMINI_API_KEY=sua-chave-api-do-google-gemini
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🗄️ Schema do Banco de Dados (Supabase)

O projeto se conecta às seguintes tabelas no Supabase:

- `public.usuarios` (contém `id`, `nome`, `telefone` UNIQUE, `ativo`)
- `public.categorias` (contém `id`, `nome`, `tipo`: 'receita' ou 'despesa')
- `public.limites_gastos` (contém `usuario_id`, `categoria_id`, `valor_limite`, `mes_ano`)
- `public.transacoes` (contém `usuario_id`, `categoria_id`, `descricao`, `valor`, `tipo_transacao`, `metodo_pagamento`, `eh_parcelado`, `parcela_atual`, `total_parcelas`, `transacao_pai_id`, `data_transacao`)

---

## 📲 Configuração do Webhook no Evolution API Go

No painel ou via API do seu servidor Evolution API Go (`evogo.medainer.com.br`), configure o webhook da instância apontando para o seu servidor:

- **URL do Webhook**: `https://seu-dominio.com/webhook/evolution` (ou via ngrok local: `https://xxxx.ngrok-free.app/webhook/evolution`)
- **Eventos Habilitados**: `MESSAGES_UPSERT` (ou `SEND_MESSAGE`)

---

## 🚀 Executando a Aplicação

Para modo desenvolvimento:
```bash
npm run dev
```

Para produção:
```bash
npm start
```

Acesse o Dashboard Web em: `http://localhost:3000`
Acesse o Gestor de Usuários Autorizados em: `http://localhost:3000/usuarios`

---

## 💬 Exemplo de Conversa no WhatsApp

> **Usuário (cadastrado em `usuarios`)**: "Almoço no restaurante R$ 45,00 no Pix"  
> **FinZap Agent**: "✅ *Despesa Registrada!*\n- **Descrição:** Almoço no restaurante\n- **Valor:** R$ 45,00\n- **Categoria:** Alimentação\n- **Método:** Pix"

> **Usuário**: "Quanto já gastei este mês?"  
> **FinZap Agent**: "📊 *Resumo de Agosto/2026:*\n- 💸 **Total Despesas:** R$ 1.250,00\n- 💰 **Total Receitas:** R$ 4.500,00\n- 🟢 **Saldo Líquido:** R$ 3.250,00"
