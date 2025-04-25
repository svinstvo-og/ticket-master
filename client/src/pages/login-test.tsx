import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function LoginTest() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const { user, loginMutation, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const handleLogin = async () => {
    try {
      await loginMutation.mutateAsync({ username, password });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const goToTickets = () => {
    navigate('/tickets');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary">Test přihlášení</h2>
          <p className="mt-2 text-gray-600">
            Tato stránka je určena k testování funkce přihlášení
          </p>
        </div>

        {user ? (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-md border border-green-200">
              <h3 className="text-lg font-medium text-green-800">Přihlášen!</h3>
              <div className="mt-2">
                <p><strong>Uživatel:</strong> {user.username}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>ID:</strong> {user.id}</p>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <Button onClick={goToTickets}>
                Přejít na tikety
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Odhlásit se
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Uživatelské jméno
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Uživatelské jméno"
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Heslo
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Heslo"
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Přihlašování...
                </>
              ) : (
                "Přihlásit se"
              )}
            </Button>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>
            Výchozí přihlašovací údaje: <br />
            Uživatelské jméno: <strong>admin</strong> <br />
            Heslo: <strong>password123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}