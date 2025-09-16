
import { cn } from '@/lib/utils';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2 mr-4" aria-label="Masjid e Aaisha Qadeem Home">
      <Image
        src="/favicon.ico"
        alt="Masjid e Aaisha Qadeem Logo"
        width={40}
        height={40}
        className={cn('rounded-md', className)}
      />
      <span className="font-headline text-lg font-bold text-primary data-[state=collapsed]:hidden sm:inline">
        Masjid e Aaisha Qadeem
      </span>
    </Link>
  );
}
