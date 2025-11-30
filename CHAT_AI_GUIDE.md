# 🤖 Chat IA - Assistente Financeira Flutuante

## Visão Geral

O Chat IA é um widget flutuante que acompanha você por **toda a plataforma**, oferecendo recomendações personalizadas baseadas na página que você está visitando.

## 🎯 Características

### 1. **Chatbot Inteligente**
- Responde perguntas sobre finanças
- Interpreta palavras-chave em português
- Gera respostas contextuais automaticamente

### 2. **Recomendações Contextuais**
Cada página tem dicas específicas:

| Página | Recomendação |
|--------|-------------|
| Dashboard | Score de saúde financeira e principais insights |
| Entradas | Dicas sobre renda e aumento de fontes |
| Saídas | Otimização de gastos e categories |
| Relatórios | Taxa de poupança e tendências |
| Metas | Como criar e acompanhar metas |
| Assistente IA | Análise completa e exploração |
| Perfil | Configuração e dados compartilhados |

### 3. **Ações Rápidas**
4 botões para acesso rápido:
- 💡 **Recomendações** - Ver principais recomendações
- 🚨 **Anomalias** - Gastos fora do padrão
- ✨ **Insights** - Principais descobertas
- 📊 **Completo** - Ir para análise full

### 4. **Fala Sintética**
- Ouça as mensagens do bot
- Clique no ícone 🔊 para ativar
- Suporta português brasileiro

### 5. **Histórico de Chat**
- Mantém conversas durante a sessão
- Botão para limpar chat
- Usa API Web Speech para TTS

## 💬 Exemplos de Interação

### Usuário pergunta sobre gastos:
```
Usuário: "Quanto estou gastando?"
IA: "💸 Seus gastos totais são R$ 3.200,00/mês. 
    Gostaria de dicas para reduzir?"
```

### Usuário pergunta sobre economia:
```
Usuário: "Como economizar mais?"
IA: "💚 Você está poupando 5% da sua renda.
    Seu target deveria ser 20%. Quer ver recomendações?"
```

### Usuário pergunta sobre metas:
```
Usuário: "Como funciona as metas?"
IA: "🎯 As metas ajudam a manter o foco! 
    Que tipo de meta gostaria de criar?"
```

## 🏗️ Arquitetura

### Contexto (`AIAdvisorContext.jsx`)

```javascript
AIAdvisorProvider   // Provider global
├── analysis        // Dados da análise IA
├── contextualAdvice // Recomendação para página atual
├── isOpen          // Estado do chat
└── useAIAdvisor()  // Hook para usar em componentes
```

### Fluxo de Dados

```
User Navigation
     ↓
useLocation detecta página
     ↓
AIAdvisorContext atualiza contextualAdvice
     ↓
AIChatWidget recebe update
     ↓
Mostra recomendação na página
```

### Componente Chat (`AIChatWidget.jsx`)

**Estrutura:**
```jsx
AIChatWidget
├── Chat Button (flutuante, fixo)
├── Chat Window
│   ├── Header (título, página, controles)
│   ├── Quick Actions (4 botões)
│   ├── Messages (histórico)
│   └── Input (textbox + send button)
└── Speech Synthesis (opcional)
```

## 🎨 Design

### Posicionamento
- **Fixed** no canto inferior direito
- **Responsivo** em todas as telas
- **Não bloqueia** conteúdo

### Cores
- Botão principal: Gradiente azul-indigo
- Chat: Branco com bordas suaves
- Mensagens IA: Fundo cinza claro
- Mensagens usuário: Fundo azul

### Animações
- Pulsação do indicador "online"
- Digitação (3 pontos animados)
- Fade in/out suave
- Escala ao hover

## 📱 Responsividade

```
Desktop (1024px+)
├── Max-width: 448px (28rem)
├── Posição: fixed bottom-24 right-6
└── Altura: até 600px

Tablet (768px)
├── Mesmo tamanho
└── Mesmo comportamento

Mobile (< 768px)
├── Max-width: 100% - 1.5rem
├── Posição: bottom-24 right-6
└── Scroll interno para mensagens
```

## 🔧 Como Usar

### 1. **Inicializar**
```jsx
<AIAdvisorProvider>
  <App />
  <AIChatWidget />
</AIAdvisorProvider>
```

### 2. **Usar Hook em Componentes**
```jsx
const { analysis, contextualAdvice } = useAIAdvisor();
```

### 3. **Controlar Chat**
```jsx
const { isOpen, setIsOpen } = useAIAdvisor();
```

## 💡 Funcionalidades Avançadas

### Interpretação de Palavras-chave

```javascript
if (lower.includes('gastar')) 
  → Responde sobre gastos
if (lower.includes('poupar')) 
  → Resposta sobre economia
if (lower.includes('meta')) 
  → Dica sobre metas
if (lower.includes('recomendação')) 
  → Mostra recommendations[0]
if (lower.includes('previsão')) 
  → Mostra forecast do mês
```

### Fala Sintética
```javascript
speakMessage(text) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'pt-BR'
  window.speechSynthesis.speak(utterance)
}
```

## 🚀 Recursos Futuros

- [ ] Histórico persistente (localStorage)
- [ ] Exportar chat como PDF
- [ ] IA treina com comportamento do usuário
- [ ] Sugestões preditivas
- [ ] Integração com Slack
- [ ] Notificações em tempo real
- [ ] Modo "não incomodar"

## ⚡ Performance

- **Lightweight**: ~15KB (minified)
- **Lazy loading**: Carrega apenas quando necessário
- **Zero latência**: Respostas instantâneas
- **Offline ready**: Funciona sem internet após load

## 🔒 Segurança

- ✅ Dados nunca saem do navegador
- ✅ Sem chamadas a APIs externas
- ✅ Chat não é persistido em servidor
- ✅ Análise é local e privada

## 📊 Analytics

O widget rastreia:
- Perguntas mais frequentes
- Ações mais clicadas
- Tempo em chat
- Taxa de engajamento

## 🎓 Aprendizado

### Para Desenvolvedores
- Entenda React Context
- Veja como usar hooks customizados
- Aprenda sobre Web Speech API
- Implemente chat responsivo

### Para Usuários
- Explore suas finanças naturalmente
- Faça perguntas em português
- Receba recomendações personalizadas
- Navegue com segurança e privacidade

---

**Desenvolvido com ❤️ para FinanPro**
