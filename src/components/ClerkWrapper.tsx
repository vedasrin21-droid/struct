import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerkEnabled = process.env.NEXT_PUBLIC_ENABLE_CLERK === 'true';

  // Only mount ClerkProvider if explicitly enabled and key is present.
  // By default, STRUCT uses high-performance native authentication backed by Neon PostgreSQL,
  // preventing client-side script loading crashes when clerk.structonline.in DNS is unconfigured.
  if (!isClerkEnabled || !publishableKey || publishableKey.trim() === '' || publishableKey.includes('placeholder')) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
