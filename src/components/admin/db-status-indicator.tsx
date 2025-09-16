
'use client';

import { useEffect, useState } from 'react';
import { checkDbConnection } from '@/app/admin/actions';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Database } from 'lucide-react';
import { useSidebar } from '../ui/sidebar';

type Status = 'checking' | 'connected' | 'disconnected';

export default function DbStatusIndicator() {
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const { state } = useSidebar();


  useEffect(() => {
    async function checkStatus() {
      const result = await checkDbConnection();
      if (result.connected) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
        setError(result.error || 'An unknown error occurred.');
      }
    }
    checkStatus();
  }, []);

  const statusConfig = {
    checking: {
      color: 'bg-yellow-400 animate-pulse',
      text: 'Checking connection...',
      tooltip: 'Attempting to connect to the database.',
    },
    connected: {
      color: 'bg-green-500',
      text: 'Database Connected',
      tooltip: 'Successfully connected to the database.',
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'DB Disconnected',
      tooltip: `Connection failed: ${error}`,
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div data-state={state} className="flex items-center gap-2 p-1 data-[state=expanded]:flex-row data-[state=collapsed]:flex-col data-[state=collapsed]:items-center data-[state=collapsed]:justify-center data-[state=collapsed]:gap-1">
                    <Database className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex items-center gap-2 data-[state=collapsed]:flex-col data-[state=collapsed]:gap-1.5">
                        <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', currentStatus.color)} />
                        <span data-state={state} className="text-xs text-muted-foreground data-[state=collapsed]:hidden">
                            {currentStatus.text}
                        </span>
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="max-w-xs">
                <p>{currentStatus.tooltip}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
}
