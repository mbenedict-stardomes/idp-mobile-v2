export function formatCurrency(amount: number, currency = 'AED'): string {
  return `${amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })} ${currency}`;
}

export function formatPhone(phone: string): string {
  if (phone.startsWith('+971') && phone.length >= 12) {
    return `+971 ${phone.slice(4, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }
  return phone;
}

export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2 || parts[0].length === 0) return email;
  return `${parts[0][0]}***@${parts[1]}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncateId(id: string, len = 12): string {
  if (id.length <= len) return id;
  return `${id.slice(0, len)}...`;
}
