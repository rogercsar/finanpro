# FinanPro - Assistante Financeira Inteligente

FinanPro é uma aplicação avançada de controle financeiro com **IA integrada** desenvolvida com React + Vite + TailwindCSS e Supabase.

## 🌟 Funcionalidades Principais

### 💰 Gestão de Transações
- ✅ Registrar/editar/excluir entradas e saídas
- ✅ Categorização automática
- ✅ Associação com metas financeiras
- ✅ Datas e descrições customizáveis

### 📊 Dashboard Inteligente
- ✅ Gráficos em tempo real (Recharts)
- ✅ Resumo financeiro com cards
- ✅ Widget IA com recomendações
- ✅ Score de saúde financeira

### 🤖 Assistente IA (100% Local)
- ✅ Detecção de padrões de gastos
- ✅ Identificação de anomalias (Z-score)
- ✅ Recomendações inteligentes
- ✅ Previsão de gastos (regressão linear)
- ✅ Chat flutuante em toda a plataforma
- ✅ Análise contextual por página
- ✅ Fala sintética (TTS)

### 📈 Análise e Relatórios
- ✅ Relatórios mensais
- ✅ Tendências por categoria
- ✅ Gastos anormais detectados
- ✅ Previsões futuras

### 🎯 Metas Financeiras
- ✅ Criar e acompanhar metas
- ✅ Progresso alimentado automaticamente
- ✅ Deadlines e status
- ✅ Vincular entradas/saídas a metas

### 👥 Perfil e Compartilhamento
- ✅ Perfil personalizável com avatar
- ✅ Compartilhamento de conta
- ✅ Gerenciar usuários compartilhados
- ✅ Autenticação segura (Supabase Auth)

### 🌓 Tema e Acessibilidade
- ✅ Dark/Light mode
- ✅ Layout mobile-first responsivo
- ✅ Interface intuitiva
- ✅ Português brasileiro

## 🚀 Quick Start

### 1. Instalação

```powershell
npm install
```

### 2. Configurar Supabase

Crie um arquivo `.env` com suas credenciais:

```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

### 3. Executar Bancos de Dados

No Supabase SQL Editor, execute esses arquivos em ordem:

1. `supabase_schema.sql` - Tabelas base
2. `supabase_schema_goals_link.sql` - Adiciona goal_id às transações
3. (Opcional) `supabase_schema_goals.sql` - Tabela de metas
4. (Opcional) `supabase_schema_shared_accounts.sql` - Compartilhamento

### 4. Rodar Localmente

```powershell
npm run dev
```

Acesse `http://localhost:5173`

### 5. Build para Produção

```powershell
npm run build
npm run preview
```

## 📱 Layout Mobile First

O FinanPro é desenvolvido com **mobile first**:
- ✅ Funciona perfeito em celulares
- ✅ Sidebar oculta em mobile (menu hambúrguer)
- ✅ Chat IA acessível sempre
- ✅ Touch-friendly buttons
- ✅ Responsivo em tablets

## 🤖 Como Funciona a IA

### Engine de Análise (`financialAnalyzer.js`)

Algoritmo próprio que faz:
1. **Coleta** últimos 6 meses de transações
2. **Calcula** estatísticas por categoria
3. **Detecta** anomalias (Z-score > 2)
4. **Gera** recomendações baseadas em regras
5. **Prevê** gastos com regressão linear
6. **Atualiza** score de saúde (0-100)

### Chat IA Flutuante

Um widget que acompanha você por toda a plataforma:
- 💬 Responde perguntas sobre finanças
- 📍 Dá recomendações contextuais por página
- 🔊 Fala sintética em português
- ⚡ 4 ações rápidas para dados principais
- 💾 Histórico durante a sessão

**Exemplos de perguntas:**
- "Quanto estou gastando?"
- "Como economizar mais?"
- "Quais são as anomalias?"
- "Qual minha saúde financeira?"

### Recomendações Inteligentes

A IA gera recomendações como:
- "Aumente taxa de poupança de 5% para 20%"
- "Seus gastos em Lazer cresceram 15% - revise"
- "Gasto de R$ 500 em Alimentação está 3x acima da média"
- "Crie metas para aumentar disciplina"

## 📊 Estrutura de Dados

### Transações
```javascript
{
  id, user_id, type, amount, category, 
  description, date, goal_id, created_at
}
```

### Metas
```javascript
{
  id, user_id, name, description,
  target_amount, current_amount, deadline, status
}
```

### Usuários Compartilhados
```javascript
{
  id, owner_id, shared_user_id, status, created_at
}
```

## 🔒 Segurança e Privacidade

- ✅ Autenticação via Supabase Auth
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ IA roda 100% local (sem APIs externas)
- ✅ Chat não é persistido em servidor
- ✅ Dados sensíveis nunca saem do seu navegador

## 📚 Documentação

- **[AI_FEATURES.md](./AI_FEATURES.md)** - Detalhes da Assistente IA
- **[CHAT_AI_GUIDE.md](./CHAT_AI_GUIDE.md)** - Guia do Chat Flutuante

## 🛠️ Stack Técnico

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build tool |
| TailwindCSS | 3.4.0 | Styling |
| Supabase | 2.86.0 | Backend/Database |
| React Router | 7.9.6 | Routing |
| Recharts | 3.5.1 | Gráficos |
| Lucide React | 0.555.0 | Ícones |
| date-fns | 4.1.0 | Datas |

## 📦 Dependências Instaladas

```json
{
  "@supabase/supabase-js": "^2.86.0",
  "clsx": "^2.1.1",
  "date-fns": "^4.1.0",
  "lucide-react": "^0.555.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.9.6",
  "recharts": "^3.5.1",
  "tailwind-merge": "^3.4.0"
}
```

## 🎯 Próximos Passos

- [ ] Importar transações de CSV
- [ ] Alertas em tempo real
- [ ] Relatórios por email
- [ ] Integração com bancos
- [ ] App mobile nativa
- [ ] Investimentos tracking
- [ ] Orçamento por categoria

## 📝 Exemplo de Uso

### 1. Autenticar-se
Faça login ou crie uma conta

### 2. Adicionar Transações
- Dashboard → Entradas/Saídas
- Ou use o Chat IA para perguntar

### 3. Acompanhar Metas
- Crie metas (Férias, Carro, Fundo)
- Associe transações às metas
- A IA atualiza progresso automaticamente

### 4. Explorar Recomendações
- Use o Chat IA flutuante
- Vá para Assistente IA para análise completa
- Consulte Relatórios para tendências

## 🤝 Suporte

Para dúvidas ou sugestões, entre em contato!

## 📄 Licença

Projeto desenvolvido com ❤️

---

**Versão:** 1.0.0  
**Última atualização:** Novembro 2025

Melhorias e próximos passos sugeridos
- Ajustar/lockar versões das dependências (Tailwind, PostCSS) para produção.
- Adicionar testes automatizados e CI (GitHub Actions).
- Validar acessibilidade (a11y) e performance (Lighthouse).
- Adicionar deploy script / integração contínua.

Estrutura resumida
- `src/` - código fonte React
- `src/pages` - páginas (Auth, Dashboard, Income, Expense, Reports)
- `src/components` - componentes reutilizáveis (Layout, TransactionList, TransactionForm)
- `src/lib/supabase.js` - cliente Supabase
- `supabase_schema.sql` - esquema SQL para criar tabelas

Suporte
Se quiser, posso:
- Rodar uma varredura de dependências e sugerir correções nas versões.
- Melhorar o visual (tema, ícones, micro-interações) e responsividade.
- Adicionar scripts de deploy e CI.

Bom desenvolvimento! 👋
