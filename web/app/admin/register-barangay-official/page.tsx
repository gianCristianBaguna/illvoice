'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Barangay {
  id: string;
  name: string;
}

export default function RegisterBarangayOfficialPage() {
  const { isAuthenticated, adminRole } = useAuth();
  const router = useRouter();
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedBarangayId, setSelectedBarangayId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (adminRole !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    fetchBarangays();
  }, [isAuthenticated, adminRole, router]);

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/admin/barangays');
      if (response.ok) {
        const data = await response.json();
        setBarangays(data);
      }
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('adminToken='))
        ?.split('=')[1];

      const response = await fetch('/api/auth/register-barangay-official', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          barangayId: selectedBarangayId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || adminRole !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register Barangay Official</CardTitle>
          <CardDescription>Create an account for a barangay official</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="official@barangay.gov"
                required
              />
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                required
              />
            </div>

            <div>
              <Label htmlFor="barangay">Barangay</Label>
              <Select value={selectedBarangayId} onValueChange={setSelectedBarangayId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a barangay" />
                </SelectTrigger>
                <SelectContent>
                  {barangays.map((barangay) => (
                    <SelectItem key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Registering...' : 'Register Barangay Official'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}