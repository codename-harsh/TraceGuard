'use client';

import React, { useEffect, useState } from 'react';
import { api, UserSettings, User } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Shield,
  Lock,
  Moon,
  Sun,
  Cloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const { user: authUser, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile state
  const [fullName, setFullName] = useState(authUser?.full_name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings / Preferences state
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load user settings
  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const data = await api.settings.get();
      setSettings(data);
      if (data.theme === 'light' || data.theme === 'dark') {
        setTheme(data.theme);
      }
    } catch (err: unknown) {
      setSettingsMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load settings',
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (authUser?.full_name) {
      setFullName(authUser.full_name);
    }
  }, [authUser]);

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);
    try {
      await api.users.updateMe(fullName.trim());
      await refreshUser();
      setProfileMessage({ type: 'success', text: 'Profile successfully updated.' });
    } catch (err: unknown) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Toggle Cloud Sync
  const handleToggleCloudSync = async () => {
    if (!settings) return;
    const nextVal = !settings.opt_in_cloud_sync;
    setIsUpdatingSettings(true);
    setSettingsMessage(null);
    try {
      const updated = await api.settings.update({ opt_in_cloud_sync: nextVal });
      setSettings(updated);
      setSettingsMessage({
        type: 'success',
        text: `Cloud sync ${nextVal ? 'enabled' : 'disabled'}. Scans are only persisted upon explicit user action.`,
      });
    } catch (err: unknown) {
      setSettingsMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update cloud sync preference.',
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Toggle Strict Redaction
  const handleToggleStrictRedaction = async () => {
    if (!settings) return;
    const nextVal = !settings.default_redaction_strict;
    setIsUpdatingSettings(true);
    setSettingsMessage(null);
    try {
      const updated = await api.settings.update({ default_redaction_strict: nextVal });
      setSettings(updated);
      setSettingsMessage({
        type: 'success',
        text: `Strict redaction ${nextVal ? 'enforced' : 'adjusted'}. Sensitive query params & cookie values remain 100% masked.`,
      });
    } catch (err: unknown) {
      setSettingsMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update redaction preference.',
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Change Theme
  const handleThemeChange = async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (!settings) return;
    try {
      const updated = await api.settings.update({ theme: newTheme });
      setSettings(updated);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100 light:text-zinc-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-400" />
          <span>Account & Security Settings</span>
        </h1>
        <p className="text-xs text-zinc-400 light:text-zinc-500">
          Manage your auditor profile, interface theme, and privacy redaction defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Preferences (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile Card */}
          <Card className="border-zinc-800 bg-zinc-900/90">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-400" />
                <span>Auditor Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your authenticated credentials for TraceGuard API access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileMessage && (
                <div
                  className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
                    Full Name / Handle
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Security Analyst"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
                    Email Address (Account ID)
                  </label>
                  <Input
                    type="email"
                    value={authUser?.email || ''}
                    disabled
                    className="opacity-75 bg-zinc-950 font-mono text-xs"
                  />
                  <span className="text-2xs text-zinc-500">
                    Email address cannot be modified once provisioned.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800 text-xs">
                    <span className="text-2xs font-mono uppercase text-zinc-500 block">
                      Account Registered
                    </span>
                    <span className="font-mono text-zinc-300">
                      {authUser?.created_at ? formatDate(authUser.created_at) : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800 text-xs">
                    <span className="text-2xs font-mono uppercase text-zinc-500 block">
                      Account Status
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Active & Verified
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" size="sm" isLoading={isUpdatingProfile}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Privacy & Cloud Sync Preferences */}
          <Card className="border-zinc-800 bg-zinc-900/90">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Auditing & Privacy Preferences</span>
              </CardTitle>
              <CardDescription>
                Synced with <code className="text-indigo-400">/api/v1/settings</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsMessage && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    settingsMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {settingsMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{settingsMessage.text}</span>
                </div>
              )}

              {isLoadingSettings ? (
                <div className="py-6 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-zinc-800">
                  {/* Theme Option */}
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 light:text-zinc-800">
                        Visual Theme Interface
                      </div>
                      <div className="text-2xs text-zinc-400">
                        Select calm dark-first cybersecurity styling or clean high-contrast light mode.
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                      <Button
                        size="sm"
                        variant={theme === 'dark' ? 'default' : 'ghost'}
                        onClick={() => handleThemeChange('dark')}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={theme === 'light' ? 'default' : 'ghost'}
                        onClick={() => handleThemeChange('light')}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </Button>
                    </div>
                  </div>

                  {/* Opt-in Cloud Sync */}
                  <div className="pt-4 flex items-center justify-between">
                    <div className="max-w-md">
                      <div className="text-xs font-semibold text-zinc-200 light:text-zinc-800 flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Opt-in Cloud Scan Sync</span>
                      </div>
                      <div className="text-2xs text-zinc-400 mt-0.5">
                        When enabled, scans you deliberately choose to &quot;Save&quot; in the extension will persist
                        to your account for historical trends and site comparison.
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={settings?.opt_in_cloud_sync ? 'default' : 'outline'}
                      onClick={handleToggleCloudSync}
                      disabled={isUpdatingSettings}
                      className="text-xs h-8 font-mono"
                    >
                      {settings?.opt_in_cloud_sync ? 'ENABLED' : 'DISABLED'}
                    </Button>
                  </div>

                  {/* Strict Redaction Enforcement */}
                  <div className="pt-4 flex items-center justify-between">
                    <div className="max-w-md">
                      <div className="text-xs font-semibold text-zinc-200 light:text-zinc-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Strict Query Parameter & Header Masking</span>
                      </div>
                      <div className="text-2xs text-zinc-400 mt-0.5">
                        Enforces zero authorization header persistence and automatic redaction of query keys
                        like <code className="text-zinc-300">?token=</code>, <code className="text-zinc-300">?key=</code>, <code className="text-zinc-300">?jwt=</code>.
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={settings?.default_redaction_strict ? 'default' : 'outline'}
                      onClick={handleToggleStrictRedaction}
                      disabled={isUpdatingSettings}
                      className="text-xs h-8 font-mono"
                    >
                      {settings?.default_redaction_strict ? 'ENFORCED' : 'OFF'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Architectural Guarantees & Score Bands (1 col) */}
        <div className="space-y-6">
          {/* Local Security Guarantees */}
          <Card className="border-zinc-800 bg-zinc-900/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                <span>Security Guarantees</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-850/80 border border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 text-2xs uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Cookie Values</span>
                </div>
                <p className="text-2xs text-zinc-400 leading-relaxed">
                  Cookie <code className="text-zinc-300">.value</code> strings are discarded immediately in browser memory. Only metadata (name, domain, path, security flags) is recorded.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-850/80 border border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 text-2xs uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Header Scrubbing</span>
                </div>
                <p className="text-2xs text-zinc-400 leading-relaxed">
                  <code className="text-zinc-300">Authorization</code>, <code className="text-zinc-300">Cookie</code>, and <code className="text-zinc-300">Set-Cookie</code> header values are scrubbed before any persistence or transmission.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-850/80 border border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 text-2xs uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Local-First Sandbox</span>
                </div>
                <p className="text-2xs text-zinc-400 leading-relaxed">
                  Scoring computation occurs locally inside the extension. Cloud backend persistence is strictly user-initiated.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Standardized Score Bands Reference */}
          <Card className="border-zinc-800 bg-zinc-900/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Score Band Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-2xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-emerald-400 font-bold">90 – 100</span>
                <span className="text-zinc-200">MINIMAL risk</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-lime-400 font-bold">75 – 89</span>
                <span className="text-zinc-200">LOW risk</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-amber-400 font-bold">55 – 74</span>
                <span className="text-zinc-200">MODERATE risk</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-orange-400 font-bold">35 – 54</span>
                <span className="text-zinc-200">ELEVATED risk</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-red-400 font-bold">0 – 34</span>
                <span className="text-zinc-200">HIGH risk</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
