import Link from 'next/link';

export function RegisterSuccess() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Request received</h1>
      <p className="text-sm text-muted-foreground">
        An admin will review it. You will be able to sign in once it is approved.
      </p>
      <Link
        href="/login/"
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-surface-muted text-sm font-medium text-foreground transition duration-200 hover:bg-border/60"
      >
        Back to sign in
      </Link>
    </div>
  );
}
