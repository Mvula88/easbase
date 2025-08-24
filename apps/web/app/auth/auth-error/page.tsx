import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-teal-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-center">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">
            There was an error authenticating your account. This could be due to:
          </p>
          <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
            <li>• The confirmation link has expired</li>
            <li>• The link has already been used</li>
            <li>• There was a problem with the authentication provider</li>
          </ul>
          <div className="space-y-2">
            <Link href="/login" className="block">
              <Button className="w-full">
                Try signing in again
              </Button>
            </Link>
            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full">
                Create a new account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}