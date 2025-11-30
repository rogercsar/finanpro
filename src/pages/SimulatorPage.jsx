import { useState } from 'react';
import { useAIAdvisor } from '../context/AIAdvisorContext';
import { Calculator, Clock, TrendingUp, TrendingDown, Zap } from 'lucide-react';

export default function SimulatorPage() {
    const { analysis } = useAIAdvisor();
    const [simulationType, setSimulationType] = useState('timeToGoal'); // 'timeToGoal' or 'recurringImpact'
    const [inputs, setInputs] = useState({
        targetAmount: '',
        monthlySaving: '',
        changeType: 'expense',
        changeAmount: '',
    });
    const [result, setResult] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
        setResult(null); // Reset result on input change
    };

    const handleSimulation = (e) => {
        e.preventDefault();
        if (simulationType === 'timeToGoal') {
            const { targetAmount, monthlySaving } = inputs;
            if (!targetAmount || !monthlySaving || +monthlySaving <= 0) {
                alert('Por favor, insira valores válidos.');
                return;
            }
            const months = +targetAmount / +monthlySaving;
            const years = Math.floor(months / 12);
            const remainingMonths = Math.ceil(months % 12);
            setResult({
                type: 'timeToGoal',
                years,
                months: remainingMonths,
                targetAmount: +targetAmount,
            });
        } else if (simulationType === 'recurringImpact') {
            const { changeType, changeAmount } = inputs;
            if (!changeAmount || +changeAmount <= 0) {
                alert('Por favor, insira um valor válido.');
                return;
            }
            const monthlyIncome = analysis?.summary.totalIncome / 6 || 0;
            const monthlyExpense = analysis?.summary.totalExpenses / 6 || 0;
            const currentMonthlyBalance = monthlyIncome - monthlyExpense;

            const change = changeType === 'income' ? +changeAmount : -changeAmount;
            const newMonthlyBalance = currentMonthlyBalance + change;

            setResult({
                type: 'recurringImpact',
                currentMonthlyBalance,
                newMonthlyBalance,
                change,
                annualImpact: change * 12,
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Simulador Financeiro</h1>
                    <p className="text-slate-600 text-sm mt-1">Planeje seu futuro e entenda o impacto de suas decisões.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Selecione o tipo de simulação:</label>
                    <select
                        value={simulationType}
                        onChange={(e) => { setSimulationType(e.target.value); setResult(null); }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900"
                    >
                        <option value="timeToGoal">Tempo para Atingir uma Meta</option>
                        <option value="recurringImpact">Impacto de Gasto/Renda Recorrente</option>
                    </select>
                </div>

                <form onSubmit={handleSimulation} className="space-y-4">
                    {simulationType === 'timeToGoal' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Meta (R$)</label>
                                <input type="number" name="targetAmount" value={inputs.targetAmount} onChange={handleInputChange} className="w-full input-form" placeholder="Ex: 50000" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Quanto você pode guardar por mês? (R$)</label>
                                <input type="number" name="monthlySaving" value={inputs.monthlySaving} onChange={handleInputChange} className="w-full input-form" placeholder="Ex: 800" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Mudança</label>
                                <select name="changeType" value={inputs.changeType} onChange={handleInputChange} className="w-full input-form">
                                    <option value="expense">Nova Despesa Mensal</option>
                                    <option value="income">Nova Renda Mensal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Mensal (R$)</label>
                                <input type="number" name="changeAmount" value={inputs.changeAmount} onChange={handleInputChange} className="w-full input-form" placeholder="Ex: 300" />
                            </div>
                        </>
                    )}
                    <button type="submit" className="btn-primary w-full sm:w-auto">
                        <Zap className="w-4 h-4 mr-2" />
                        Calcular Simulação
                    </button>
                </form>
            </div>

            {result && (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 animate-in fade-in duration-500">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Resultado da Simulação</h3>
                    {result.type === 'timeToGoal' && (
                        <div className="text-center">
                            <Clock className="w-12 h-12 mx-auto text-blue-600 mb-2" />
                            <p className="text-slate-700">Para atingir sua meta de <span className="font-bold">R$ {result.targetAmount.toLocaleString('pt-BR')}</span>, você levará aproximadamente:</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                                {result.years > 0 && `${result.years} ano(s) e `}
                                {result.months} mes(es)
                            </p>
                        </div>
                    )}
                    {result.type === 'recurringImpact' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                <p className="text-slate-600">Saldo mensal atual:</p>
                                <p className="font-bold text-slate-800">R$ {result.currentMonthlyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className={`flex justify-between items-center p-3 rounded-lg ${result.change > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                <p className={`font-medium ${result.change > 0 ? 'text-green-800' : 'text-red-800'}`}>Novo saldo mensal:</p>
                                <p className={`font-bold text-xl ${result.change > 0 ? 'text-green-700' : 'text-red-700'}`}>R$ {result.newMonthlyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-center pt-4">
                                {result.change > 0 ? <TrendingUp className="w-10 h-10 mx-auto text-green-600 mb-2" /> : <TrendingDown className="w-10 h-10 mx-auto text-red-600 mb-2" />}
                                <p className="text-slate-700">Impacto anual no seu poder de poupança:</p>
                                <p className={`text-2xl font-bold ${result.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.change > 0 ? '+' : '-'} R$ {Math.abs(result.annualImpact).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const StatCard = ({ label, value, trend, color }) => {
    const colorClass = {
        green: 'bg-green-50 text-green-700',
        red: 'bg-red-50 text-red-700',
        blue: 'bg-blue-50 text-blue-700'
    }[color];

    return (
        <div className={`p-4 rounded-lg ${colorClass}`}>
            <p className="text-xs font-medium opacity-75">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {trend && (
                <div className="flex items-center gap-1 text-xs mt-2">
                    {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {trend === 'up' ? 'Positivo' : 'Negativo'}
                </div>
            )}
        </div>
    );
}