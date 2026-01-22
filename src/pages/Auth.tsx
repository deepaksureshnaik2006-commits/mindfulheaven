import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldQuestion } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  // Forgot password states
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'questions' | 'newPassword' | 'success'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState<{ question1: string; question2: string } | null>(null);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message === 'Invalid login credentials' 
              ? 'Invalid email or password. Please try again.'
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully signed in.',
          });
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to Mindful Heaven. Please set up your security questions in Settings.',
          });
          navigate('/dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForgotPasswordState = () => {
    setResetStep('email');
    setResetEmail('');
    setSecurityQuestions(null);
    setAnswer1('');
    setAnswer2('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetError('');
    setResetLoading(false);
  };

  const handleGetSecurityQuestions = async () => {
    if (!resetEmail.trim()) {
      setResetError('Please enter your email');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      const { data, error } = await supabase.functions.invoke('security-password-reset', {
        body: { action: 'get-questions', email: resetEmail.trim().toLowerCase() }
      });

      if (error) throw error;

      if (data.error === 'no_questions') {
        setResetError('No security questions set up for this account. Please contact support or use a different recovery method.');
        return;
      }

      if (data.error) {
        setResetError(data.error);
        return;
      }

      setSecurityQuestions({ question1: data.question1, question2: data.question2 });
      setResetStep('questions');
    } catch (err: any) {
      console.error('Error fetching security questions:', err);
      setResetError('Failed to fetch security questions. Please check your email and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyAnswers = async () => {
    if (!answer1.trim() || !answer2.trim()) {
      setResetError('Please answer both security questions');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      const { data, error } = await supabase.functions.invoke('security-password-reset', {
        body: {
          action: 'verify-answers',
          email: resetEmail.trim().toLowerCase(),
          answer1: answer1.trim(),
          answer2: answer2.trim()
        }
      });

      if (error) throw error;

      if (!data.verified) {
        setResetError(data.error || 'Security answers are incorrect. Please try again.');
        return;
      }

      // Answers verified! Move to password step
      setResetStep('newPassword');
    } catch (err: any) {
      console.error('Error verifying answers:', err);
      setResetError('Security answers are incorrect. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!answer1.trim() || !answer2.trim()) {
      setResetError('Please answer both security questions');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      const { data, error } = await supabase.functions.invoke('security-password-reset', {
        body: {
          action: 'verify-and-reset',
          email: resetEmail.trim().toLowerCase(),
          answer1: answer1.trim(),
          answer2: answer2.trim(),
          newPassword
        }
      });

      if (error) throw error;

      if (data.error) {
        setResetError(data.error);
        return;
      }

      setResetStep('success');
      toast({
        title: 'Password Reset Successful',
        description: 'You can now sign in with your new password.',
      });
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setResetError('Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      {/* Back button */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl shadow-medium p-8 border border-border">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-calm flex items-center justify-center shadow-soft">
              <Heart className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          <h1 className="font-serif text-2xl font-semibold text-center text-foreground mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {isLogin
              ? 'Sign in to access your dashboard'
              : 'Start your mental health journey today'}
          </p>

          {user && (
            <div className="mb-6 p-4 rounded-xl bg-sage-light/50">
              <p className="text-sm text-muted-foreground">
                You're already signed in as <span className="font-medium">{user.email}</span>.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button type="button" className="w-full" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/dashboard/settings')}
                >
                  Settings
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {isLogin && !user && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    resetForgotPasswordState();
                    setResetEmail(email);
                    setForgotPasswordOpen(true);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <div className="mt-6 p-4 bg-sage-light/50 rounded-xl">
            <p className="text-xs text-center text-muted-foreground">
              🔒 Your privacy is our priority. Upon sign-up, you'll be assigned an anonymous identity. All data is encrypted and your real identity remains hidden.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={(open) => {
        setForgotPasswordOpen(open);
        if (!open) resetForgotPasswordState();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldQuestion className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              {resetStep === 'email' && 'Enter your email to recover your account using security questions.'}
              {resetStep === 'questions' && 'Answer your security questions to verify your identity.'}
              {resetStep === 'newPassword' && 'Set your new password.'}
              {resetStep === 'success' && 'Your password has been reset successfully!'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {resetStep === 'email' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {resetError && <p className="text-sm text-destructive">{resetError}</p>}
                <Button 
                  onClick={handleGetSecurityQuestions} 
                  className="w-full" 
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Checking...' : 'Continue'}
                </Button>
              </>
            )}

            {resetStep === 'questions' && securityQuestions && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{securityQuestions.question1}</Label>
                    <Input
                      type="text"
                      placeholder="Your answer"
                      value={answer1}
                      onChange={(e) => setAnswer1(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{securityQuestions.question2}</Label>
                    <Input
                      type="text"
                      placeholder="Your answer"
                      value={answer2}
                      onChange={(e) => setAnswer2(e.target.value)}
                    />
                  </div>
                </div>
                {resetError && <p className="text-sm text-destructive">{resetError}</p>}
                <Button 
                  onClick={handleVerifyAnswers} 
                  className="w-full"
                  disabled={resetLoading || !answer1.trim() || !answer2.trim()}
                >
                  {resetLoading ? 'Verifying...' : 'Verify Answers'}
                </Button>
              </>
            )}

            {resetStep === 'newPassword' && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                {resetError && <p className="text-sm text-destructive">{resetError}</p>}
                <Button 
                  onClick={handleVerifyAndReset} 
                  className="w-full" 
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setResetStep('questions')} 
                  className="w-full"
                >
                  Back
                </Button>
              </>
            )}

            {resetStep === 'success' && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-sage-light/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    ✅ Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    resetForgotPasswordState();
                  }} 
                  className="w-full"
                >
                  Sign In Now
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
