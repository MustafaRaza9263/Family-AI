'use client';

import { Card } from '@/components/ui/card';
import { useMe } from '@/features/auth/hooks';
import { firstName, greetingForNow } from '@/lib/format';

export default function HomePage() {
  const { data } = useMe();
  const name = data?.user ? firstName(data.user.fullName) : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {greetingForNow()}, {name}
        </h1>
        <p className="mt-2 text-muted-foreground">Your workspace is ready.</p>
      </div>
      <Card>
        <p className="text-sm text-muted-foreground">
          Image and video tools are on the way.
        </p>
      </Card>
    </div>
  );
}
