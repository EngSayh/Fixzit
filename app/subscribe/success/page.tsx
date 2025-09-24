'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SubscribeSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const tranRef = searchParams.get('tran_ref');
      const status = searchParams.get('status');
      
      if (status === 'success' || tranRef) {
        setStatus('success');
        setMessage('Your subscription has been successfully activated! You can now access all your subscribed modules.');
      } else if (status === 'error' || status === 'failed') {
        setStatus('error');
        setMessage('Payment was not successful. Please try again or contact support if the issue persists.');
      } else {
        setStatus('error');
        setMessage('Unable to verify payment status. Please contact support for assistance.');
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900">Verifying Payment...</h2>
          <p className="text-gray-600 mt-2">Please wait while we confirm your subscription</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            {status === 'success' ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <CardTitle className="text-2xl">
              {status === 'success' ? 'Subscription Activated!' : 'Payment Issue'}
            </CardTitle>
            <CardDescription className="text-lg">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {status === 'success' ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">What's Next?</h3>
                  <ul className="text-sm text-green-700 space-y-1 text-left">
                    <li>• Your subscription is now active</li>
                    <li>• You can access all subscribed modules in your dashboard</li>
                    <li>• A welcome email has been sent to your billing address</li>
                    <li>• Your first invoice is available in the billing section</li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link href="/support">Contact Support</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">Need Help?</h3>
                  <ul className="text-sm text-red-700 space-y-1 text-left">
                    <li>• Check your payment method and try again</li>
                    <li>• Contact our support team for assistance</li>
                    <li>• Verify your billing information</li>
                    <li>• Check with your bank if the payment was declined</li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link href="/subscribe">Try Again</Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link href="/support">Contact Support</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}