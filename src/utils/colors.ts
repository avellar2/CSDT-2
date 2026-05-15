const PRIORITY_HEX: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

export function getPriorityHex(priority: string): string {
  return PRIORITY_HEX[priority] || '#3b82f6';
}

export function getPriorityClasses(priority: string): string {
  switch (priority) {
    case 'URGENT': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'MEDIUM': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'NORMAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
}
