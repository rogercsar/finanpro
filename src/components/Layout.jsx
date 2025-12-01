import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAIAdvisor } from '../context/AIAdvisorContext';
import {
    LayoutDashboard,
    PieChart,
    ArrowUpCircle,
    ArrowDownCircle,
    LogOut,
    Menu,
    X,
    Wallet,
    User,
    Target,
    Brain,
    Calculator,
    Repeat,
    Settings
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

export default function Layout() {
    const { signOut, user } = useAuth();
    const location = useLocation();
    const { analysis } = useAIAdvisor();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto'; // Cleanup on component unmount
        };
    }, [isMobileMenuOpen]);

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/income', label: 'Entradas', icon: ArrowUpCircle },
        { path: '/expenses', label: 'Saídas', icon: ArrowDownCircle },
        { path: '/reports', label: 'Relatórios', icon: PieChart },
        { path: '/goals', label: 'Metas', icon: Target },
        { path: '/advisor', label: 'Assistente IA', icon: Brain },
        { path: '/subscriptions', label: 'Assinaturas', icon: Repeat },
        { path: '/simulator', label: 'Simulador', icon: Calculator },
        { path: '/profile', label: 'Perfil', icon: Wallet },
        { path: '/settings/currency', label: 'Moedas', icon: Settings },
    ];

    const getHealthBorderColor = () => {
        if (!analysis || analysis.healthScore === null) {
            return 'ring-slate-200'; // Cor padrão ou de carregamento
        }
        const score = analysis.healthScore;
        if (score >= 75) return 'ring-green-500'; // Ótimo
        if (score >= 40) return 'ring-yellow-500'; // Alerta
        return 'ring-red-500'; // Crítico
    };

    const getHealthBorderTooltip = () => {
        if (!analysis || analysis.healthScore === null) {
            return 'Saúde financeira sendo calculada...';
        }
        const score = analysis.healthScore;
        if (score >= 75) return `Saúde Financeira: Ótima (${score}/100)`;
        if (score >= 40) return `Saúde Financeira: Atenção (${score}/100).`;
        return `Saúde Financeira: Crítica (${score}/100).`;
    };

    return (
        <div className="min-h-screen bg-slate-50/50 flex font-sans overflow-x-hidden">
            {/* Sidebar Desktop */} 
            <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 fixed h-full z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-8 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <Wallet className="w-6 h-6" />
                        </div>
                        FinanIA 
                    </h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group", 
                                    isActive
                                        ? "bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <Icon className={clsx("w-5 h-5 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                    <div className="p-4 m-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className={clsx(
                                    "w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-white font-bold border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden flex-shrink-0 ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 transition-colors duration-500",
                                    getHealthBorderColor()
                                )}
                                title={getHealthBorderTooltip()}
                            >
                                {user?.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">
                                    {user?.user_metadata?.full_name || 'Usuário'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a href="/profile" className="flex-1 btn-ghost text-left">Ver Perfil</a>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 rounded-lg transition-colors text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
            </aside>

            {/* Mobile Header */}
                <div className="md:hidden fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-blue-600" />
                        FinanIA
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-white dark:bg-slate-900 z-20 pt-20 px-4 animate-in slide-in-from-top-10 fade-in duration-200">
                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-4 rounded-xl border transition-colors",
                                        location.pathname === item.path 
                                            ? "bg-blue-50 dark:bg-blue-600/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-medium"
                                            : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-4 text-red-600 dark:text-red-500 w-full border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/10 rounded-xl mt-6 font-medium"
                        >
                            <LogOut className="w-5 h-5" />
                            Sair
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-72 p-4 md:p-8 pt-20 md:pt-8 min-h-screen transition-all bg-blue-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
