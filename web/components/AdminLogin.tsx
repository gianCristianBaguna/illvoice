'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const router = useRouter();

  useEffect(() => {
    const handleGoogleSignIn = async (response: any) => {
      setLoading(true);
      setError('');

      try {
        const serverResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/google-signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: response.credential }),
        });

        // Read response safely to avoid HTML parsing errors
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

        if (!data || !data.token || !data.email) {
          throw new Error('Invalid server response');
        }

        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminEmail', data.email);

        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    };

    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      console.log('Google Client ID:', clientId);

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
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/verify', {
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
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminEmail', email);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ILLVOICE Admin</h1>
        <p className="text-gray-600 mb-8">Community Issue Monitoring Dashboard</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@barangay.gov"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-500 text-sm">Or continue with</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        <div id="google-signin-button" className="flex justify-center"></div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-2">Demo Credentials:</p>
          <p>Email: admin@demo.gov</p>
          <p>Password: admin123</p>
        </div>
      </div>
    </div>
  );
}