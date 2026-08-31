'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    // Supabase detecta el token de recuperación en la URL y emite PASSWORD_RECOVERY.
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) setReady(true);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        const { error: updErr } = await supabase.auth.updateUser({ password });
        if (updErr) {
            setError('No se pudo actualizar la contraseña. Abre de nuevo el enlace del correo e inténtalo otra vez.');
        } else {
            setDone(true);
        }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center text-2xl mb-3">🔑</div>
                    <h1 className="text-lg font-black text-white">Nueva contraseña</h1>
                    <p className="text-xs text-slate-400 mt-1">SCOTT GAMES · Admin</p>
                </div>

                {done ? (
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">✓</div>
                        <p className="text-sm text-slate-300">Tu contraseña se actualizó correctamente.</p>
                        <Link href="/admin" className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition">
                            Ir al panel
                        </Link>
                    </div>
                ) : (
                    <>
                        {!ready && (
                            <p className="text-[11px] text-amber-400 text-center mb-3">
                                Abre esta página desde el enlace que te enviamos por correo para restablecer tu contraseña.
                            </p>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Nueva contraseña"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pr-11 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-base"
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={confirm}
                                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                                placeholder="Confirmar contraseña"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                            />
                            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
                                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                            </button>
                        </form>
                        <Link href="/admin" className="block text-center text-xs text-slate-500 hover:text-slate-300 mt-5 transition">
                            ← Volver al login
                        </Link>
                    </>
                )}
            </div>
        </main>
    );
}
