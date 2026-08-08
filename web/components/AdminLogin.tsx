'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

declare global {
  interface Window {
    google: any;
  }
}

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const handleGoogleSignIn = async (response: any) => {
      setLoading(true);
      setError('');

      try {
        const serverResponse = await fetch('/api/auth/google-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential }),
        });

        const contentType = serverResponse.headers.get('content-type');
        if (!serverResponse.ok) {
          let errorMsg = 'Google sign-in failed';
          if (contentType && contentType.includes('application/json')) {
            const errorData = await serverResponse.json();
            errorMsg = errorData.error || errorMsg;
          }
          throw new Error(errorMsg);
        }

        const data =
          contentType && contentType.includes('application/json')
            ? await serverResponse.json()
            : null;

        if (!data || !data.success) {
          throw new Error('Invalid server response');
        }

        login(data.token, data.email, data.role, data.barangayId, data.emailVerified);
        if (!data.emailVerified && data.role !== 'ADMIN' && data.role !== 'BARANGAY_OFFICIAL') {
          router.push('/verify-email');
        } else if (data.role === 'BARANGAY_OFFICIAL') {
          router.push('/barangay-dashboard');
        } else {
          router.push('/dashboard');
        }
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (window.google && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSignIn,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large' }
        );
      } else {
        console.error('Google SDK not loaded or client_id missing');
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [router, login]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let msg = 'Login failed';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          msg = data.error || msg;
        }
        throw new Error(msg);
      }

      const data = await response.json();

      login(data.token, data.email, data.role, data.barangayId || null, data.emailVerified);
      if (!data.emailVerified && data.role !== 'ADMIN' && data.role !== 'BARANGAY_OFFICIAL') {
        router.push('/verify-email');
      } else if (data.role === 'BARANGAY_OFFICIAL') {
        router.push('/barangay-dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-slate-950 to-indigo-950/30"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-3xl"></div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>

      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-slate-800/50">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
              <Image src="/whitelogo.png" alt="ILLVoice logo" width={200} height={50} className="h-14 w-auto object-contain relative" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@illvoice.local"
                required
                className="bg-slate-800/50 text-white border-slate-700/50 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-800/50 text-white border-slate-700/50 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.292 4.292M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700/50"></div>
            <span className="text-slate-500 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-700/50"></div>
          </div>

          <div id="google-signin-button" className="flex justify-center"></div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Secured by ILLVoice
        </p>
      </div>
    </div>
  );
}
