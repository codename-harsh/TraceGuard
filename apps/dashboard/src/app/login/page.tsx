'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Shield, Sparkles, Lock, Mail } from 'lucide-react';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemo } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('Authentication failed. Please verify credentials.');
      }
    }
  };

  const handleDemoSignIn = async () => {
    setApiError(null);
    setIsDemoLoading(true);
    try {
      await loginAsDemo();
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('Failed to sign in to Demo account.');
      }
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6 py-12">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/90 shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Shield className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold">Sign In to TraceGuard</CardTitle>
          <CardDescription>
            Access your cloud-synced website scans and intelligence reports.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Prominent One-Click Demo Mode Button */}
          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Evaluator Demo</span>
              </div>
              <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                demo@traceguard.local
              </span>
            </div>
            <p className="text-2xs text-amber-200/80 mb-3 leading-relaxed">
              Sign in with 4 seeded audit scans to test all charts, site comparisons, and JSON/CSV reports.
            </p>
            <Button
              type="button"
              variant="default"
              size="sm"
              isLoading={isDemoLoading}
              onClick={handleDemoSignIn}
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold gap-1.5 h-8 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore Demo Mode</span>
            </Button>
          </div>

          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-2 text-2xs uppercase tracking-wider text-zinc-500 font-mono absolute">
              or sign in with password
            </span>
          </div>

          {apiError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                icon={<Mail className="w-3.5 h-3.5" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-3.5 h-3.5" />}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 text-center text-xs text-zinc-400 pt-2">
          <div>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-indigo-400 hover:underline">
              Create an account
            </Link>
          </div>
          <div className="text-2xs text-zinc-500">
            Local browser extension analysis never requires an account.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
