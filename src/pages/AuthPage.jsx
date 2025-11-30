import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wallet, Lock, Mail, User } from 'lucide-react';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');

    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn({ email, password });
                if (error) throw error;
                navigate('/');
            } else {
                const { error } = await signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });
                if (error) throw error;
                // Auto login or show message
                if (!error) {
                    alert('Cadastro realizado! Verifique seu email ou faça login.');
                    setIsLogin(true);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Wallet className="w-8 h-8 text-primary" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">
                        FinanPro
                    </h2>
                    <p className="text-center text-slate-500 mb-8">
                        {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta para começar'}
                    </p>

                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Nome Completo"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-slate-900"
                                    required
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-slate-900"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-slate-900"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-primary hover:underline"
                        >
                            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
