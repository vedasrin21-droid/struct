import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey || publishableKey.trim() === '' || publishableKey.includes('placeholder')) {
    // In local development or testing without Clerk keys, render children directly
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
