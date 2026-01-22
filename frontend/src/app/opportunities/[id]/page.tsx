// Route disabled: CRUD must be done via modals.
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OpportunityDetailPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/opportunities');
  }, [router]);
  return null;
}
