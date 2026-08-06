'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Mail, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [sending, setSending] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const { emailVerified, setEmailVerified, isAuthenticated, adminRole, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (adminRole === 'ADMIN') {
      router.replace('/dashboard');
    } else if (emailVerified) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, emailVerified, adminRole, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-email/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (response.ok) {
        setEmailVerified(true);
        toast.success('Email verified successfully!');
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch('/api/auth/verify-email/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        if (data.code) {
          setDevCode(data.code);
          toast.info(`Dev code: ${data.code}`);
        } else {
          toast.success('Verification code resent!');
        }
      } else {
        toast.error(data.error || 'Failed to resend code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleSendCode = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/auth/verify-email/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        if (data.code) {
          setDevCode(data.code);
          toast.info(`Dev code: ${data.code}`);
        } else {
          toast.success('Verification code sent!');
        }
      } else {
        toast.error(data.error || 'Failed to send code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated || emailVerified || adminRole === 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative">
        <button
          onClick={async () => {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('adminToken');
              window.localStorage.removeItem('adminEmail');
              window.localStorage.removeItem('adminRole');
              window.localStorage.removeItem('barangayId');
            }
            await logout();
            window.location.replace('/login');
          }}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>

        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail size={40} className="text-blue-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Verify Your Email
        </h1>
        <p className="text-sm text-gray-600 text-center mb-8">
          Enter the 6-digit code sent to your email address
        </p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest font-mono bg-white dark:bg-white text-black"
              maxLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-gray-500">Didn't receive the code?</span>
          <div className="flex gap-2">
            <button
              onClick={handleSendCode}
              disabled={sending}
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              {sending ? 'Sending...' : 'Send Code'}
            </button>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              {resending ? 'Resending...' : 'Resend'}
            </button>
          </div>
        </div>

        {devCode && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              Dev code: <strong>{devCode}</strong>
            </p>
            <p className="text-xs text-yellow-600 text-center mt-1">
              Email sending not configured
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
