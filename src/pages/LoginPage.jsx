import { useState } from 'react';
import { Card, Label, TextInput, Button, Alert } from 'flowbite-react';
import { useNavigate } from 'react-router-dom';
import { Client, Account } from 'appwrite';
import { useAuth } from '../contexts/AuthContext.jsx';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const client = new Client()
        .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
        .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

      const account = new Account(client);

      // Try to delete any existing session first (in case browser data was cleared but server session remains)
      try {
        await account.deleteSession('current');
      } catch (err) {
        // Ignore error if no session exists - this is expected on first login
      }

      // Create email password session
      await account.createEmailPasswordSession(email, password);

      // Get the user to retrieve their ID
      const user = await account.get();

      // Set authentication flag and user ID to enable offline access
      login(user.$id);

      // Redirect to home page on successful login
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>

        {error && (
          <Alert color="failure" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="email" value="Email" />
            </div>
            <TextInput
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="password" value="Password" />
            </div>
            <TextInput
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default LoginPage;
