# FinanPro - Assistente Financeira IA Integrada

## 🤖 Sobre a Assistente Financeira

A FinanPro inclui um **algoritmo de IA próprio** (sem APIs externas) que analisa seus padrões financeiros e fornece recomendações inteligentes.

### Funcionalidades da IA:

#### 1. **Análise de Padrões** 📊
- Detecta gastos por categoria
- Calcula média, máximo, mínimo e desvio padrão
- Identifica tendências de crescimento/redução

#### 2. **Detecção de Anomalias** 🚨
- Usa Z-score para identificar gastos anormais
- Compara cada transação com o padrão histórico
- Classifica por severidade (alta/média)

#### 3. **Recomendações Personalizadas** 💡
- Taxa de poupança abaixo de 20%?
- Gasto crescente em uma categoria?
- Gastos anormais detectados?
- A IA sugere ações específicas

#### 4. **Previsão de Gastos** 📈
- Prevê gastos do próximo mês por categoria
- Usa tendência linear simples
- Ajusta baseado em padrões históricos

#### 5. **Score de Saúde Financeira** 💚
- Score de 0-100 baseado em:
  - Taxa de poupança
  - Anomalias detectadas
  - Gastos elevados
  - Metas ativas/completadas

#### 6. **Insights Automáticos** 💬
- Gerados dinamicamente baseado em seus dados
- Textos em português natural
- Atualizados em tempo real

## 🏗️ Arquitetura Técnica

### Engine de Análise (`src/lib/financialAnalyzer.js`)

```javascript
class FinancialAnalyzer {
    analyze()           // Análise completa
    getSummary()        // Resumo financeiro
    detectPatterns()    // Padrões de gasto
    detectAnomalies()   // Gastos anormais
    analyzeCategoryTrends() // Tendências
    forecastNextMonth() // Previsão
    calculateHealthScore() // Score de saúde
    generateRecommendations() // Recomendações
    generateInsights()  // Insights textuais
}
```

### Algoritmos Utilizados

1. **Z-Score** para detecção de anomalias
   ```
   Z = (valor - média) / desvio_padrão
   Se Z > 2 → É uma anomalia
   ```

2. **Regressão Linear** para calcular tendências
   ```
   Slope = Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²)
   ```

3. **Desvio Padrão** para medir variabilidade
   ```
   σ = √(Σ(x - μ)² / n)
   ```

## 🎯 Como Usar

### 1. Dashboard - Widget da IA
Na página inicial, você vê:
- Score de Saúde Financeira
- 2 principais insights
- Primeira recomendação prioritária
- Botão para "Ver Mais"

### 2. Página Assistente Financeira (`/advisor`)
Acesse no menu lateral ou clique em "Ver Mais"

**Seções disponíveis:**

| Seção | O que mostra |
|-------|-------------|
| Resumo | Renda, Despesas, Saldo, Taxa Poupança |
| Recomendações | Ações específicas com impacto estimado |
| Gastos Anormais | Transações fora do padrão detectadas |
| Padrões de Gastos | Estatísticas por categoria |
| Previsão | Gastos esperados próximo mês |
| Tendências | Crescimento/redução por categoria |

## 📊 Exemplos de Análise

### Detecção de Anomalia
```
Você gasta em média R$ 150 em Alimentação
Desvio padrão: R$ 30
Uma compra de R$ 300 é detectada
Z-score = (300 - 150) / 30 = 5.0
❌ ALERTA: Gasto 5x acima do normal!
```

### Recomendação
```
Taxa de poupança: 5% (alvo: 20%)
Maior gasto: Lazer (R$ 500/mês)
💡 RECOMENDAÇÃO:
   Título: "Aumente sua taxa de poupança"
   Ação: Reduza Lazer em 10-15%
   Impacto: +R$ 50-75 poupados/mês
```

### Previsão
```
Mês anterior: Alimentação = R$ 400
2 meses: R$ 380
Tendência: -5% ao mês
Previsão próximo mês: R$ 361
```

## 🚀 Recursos Futuros

- [ ] Categorização automática com IA
- [ ] Chat conversacional
- [ ] Alertas em tempo real
- [ ] Metas inteligentes sugeridas
- [ ] Comparação com benchmarks
- [ ] Exportar análises

## 🔧 Implementação Técnica

### Integração com Supabase
```javascript
// Fetch últimos 6 meses
const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', sixMonthsAgo)

// Análise
const analyzer = new FinancialAnalyzer(data, goals)
const analysis = analyzer.analyze()
```

### Componentes React
- `FinancialAdvisorPage.jsx` - Página principal
- `SectionCard` - Cards retráteis
- `RecommendationCard` - Cards de recomendação
- `PatternCard` - Padrões de gasto
- `TrendCard` - Tendências

## 📱 Responsividade

A Assistente Financeira é totalmente responsiva:
- ✅ Desktop (3+ colunas)
- ✅ Tablet (2 colunas)
- ✅ Mobile (1 coluna)

## ⚙️ Performance

- Análise completa: ~100ms (com 1000 transações)
- Sem chamadas externas
- Processamento 100% local/cliente
- Escalável

## 📝 Exemplo de Output Completo

```javascript
{
    summary: {
        totalIncome: 5000,
        totalExpenses: 3200,
        balance: 1800,
        savingsRate: 36,
        transactionCount: 45
    },
    healthScore: 72,
    insights: [
        "💰 Ótima notícia! Você acumulou R$ 1.800,00 neste período",
        "🔝 Sua maior despesa é Alimentação com média de R$ 380,00/mês",
        "✅ Você economiza 36% da sua renda. Parabéns!"
    ],
    recommendations: [
        {
            priority: "média",
            title: "Otimize gastos em Lazer",
            description: "...",
            action: "Reduza em 10-15% ou busque alternativas",
            impact: "Economia potencial: R$ 45,00/mês"
        }
    ],
    anomalies: [
        {
            transaction: "Restaurante Premium",
            category: "Alimentação",
            amount: 500,
            date: "2025-11-28",
            severity: "alta",
            reason: "Gasto de R$ 500,00 em Alimentação está 3.3x acima do normal"
        }
    ]
}
```

## 🎓 Como Funciona a IA

A IA não é um modelo de aprendizado profundo, mas um **sistema inteligente de regras baseado em estatística**:

1. Coleta dados históricos (últimos 6 meses)
2. Calcula estatísticas por categoria
3. Compara cada nova transação com o padrão
4. Gera recomendações baseadas em regras inteligentes
5. Atualiza em tempo real

**Vantagens:**
- ✅ Funciona offline
- ✅ Sem custos com APIs
- ✅ Privado (dados não saem do seu navegador)
- ✅ Rápido
- ✅ Transparente (você entende como funciona)

---

**Desenvolvido com ❤️ para FinanPro**
