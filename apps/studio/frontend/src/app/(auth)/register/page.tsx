import { RegisterForm } from '@/features/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Request account</h1>
        <p className="text-sm text-muted-foreground">
          Fill in the details below. An admin will review your request, and you
          can sign in once it is approved.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
