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
import { Shield, Lock, Mail, User as UserIcon } from 'lucide-react';

const RegisterSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await registerUser(data.email, data.password, data.fullName);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('Registration failed. Please check your details.');
      }
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6 py-12">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/90 shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Shield className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Opt in to cloud scan persistence, comparison history, and cross-site trends.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
                Full Name (Optional)
              </label>
              <Input
                type="text"
                placeholder="Jane Doe"
                icon={<UserIcon className="w-3.5 h-3.5" />}
                error={errors.fullName?.message}
                {...register('fullName')}
              />
            </div>

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
                Password (minimum 8 characters)
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-3.5 h-3.5" />}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div className="p-3 rounded-lg bg-zinc-850/60 border border-zinc-800 text-2xs text-zinc-400">
              By creating an account, you enable optional cloud syncing for scans you deliberately save.
              Raw cookie values and passwords are never transmitted or stored.
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Register Account
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 text-center text-xs text-zinc-400 pt-2">
          <div>
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
