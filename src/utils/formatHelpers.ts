// Indian Number Formatting - Lakhs and Crores
export const formatIndianNumber = (value: number, decimals: number = 2): string => {
  if (value === 0) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  // Format with Indian numbering system (lakhs, crores)
  if (absValue >= 10000000) {
    // Crores (1 crore = 10 million)
    const crores = absValue / 10000000;
    return `${sign}${crores.toFixed(decimals)} Cr`;
  } else if (absValue >= 100000) {
    // Lakhs (1 lakh = 100 thousand)
    const lakhs = absValue / 100000;
    return `${sign}${lakhs.toFixed(decimals)} Lac`;
  } else {
    // Regular number with Indian comma formatting
    return `${sign}${absValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
};

// Format number with Indian commas and max 2 decimals
// Indian numbering: 1,000 (thousand), 10,000, 1,00,000 (lakh), 10,00,000, 1,00,00,000 (crore)
// Pattern: comma after first 3 digits from right, then every 2 digits
export const formatIndianNumberWithDecimals = (value: number, maxDecimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  
  // Round to max decimals
  const rounded = Number(value.toFixed(maxDecimals));
  
  // Split into integer and decimal parts
  const parts = rounded.toString().split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] || '';
  
  // Handle negative numbers
  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }
  
  // Indian numbering system: comma after first 3 digits from right, then every 2 digits
  // Examples: 
  // 1234 -> 1,234
  // 12345 -> 12,345
  // 123456 -> 1,23,456
  // 1234567 -> 12,34,567
  // 12345678 -> 1,23,45,678
  let formattedInteger = '';
  const length = integerPart.length;
  
  if (length <= 3) {
    formattedInteger = integerPart;
  } else {
    // Take last 3 digits (hundreds, tens, ones)
    const lastThree = integerPart.slice(-3);
    let remaining = integerPart.slice(0, -3);
    
    // Process remaining digits from right to left, adding commas every 2 digits
    let formattedRemaining = '';
    let i = remaining.length;
    while (i > 0) {
      const start = Math.max(0, i - 2);
      const chunk = remaining.slice(start, i);
      formattedRemaining = chunk + (formattedRemaining ? ',' + formattedRemaining : '');
      i = start;
    }
    
    formattedInteger = formattedRemaining + ',' + lastThree;
  }
  
  // Add negative sign back if needed
  if (isNegative) {
    formattedInteger = '-' + formattedInteger;
  }
  
  // Return with decimal part
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

// Indian Currency Formatting
export const formatCurrency = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 10000000) {
    // Crores
    const crores = absValue / 10000000;
    return `${sign}₹${formatIndianNumberWithDecimals(crores, 2)} Cr`;
  } else if (absValue >= 100000) {
    // Lakhs
    const lakhs = absValue / 100000;
    return `${sign}₹${formatIndianNumberWithDecimals(lakhs, 2)} Lac`;
  } else {
    // Regular formatting with Indian commas
    return `${sign}₹${formatIndianNumberWithDecimals(absValue, 2)}`;
  }
};

// Indian Date Formatting - DD/MM/YYYY
export const formatIndianDate = (dateStr: string | Date): string => {
  if (!dateStr) return 'N/A';
  
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
};

// Indian Date with Time - DD/MM/YYYY HH:MM
export const formatIndianDateTime = (dateStr: string | Date): string => {
  if (!dateStr) return 'N/A';
  
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return 'N/A';
  }
};

// Relative date formatting with Indian date fallback
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // Fallback to Indian date format
    return formatIndianDate(date);
  } catch {
    return 'N/A';
  }
};

export const getMaxValue = <T extends { value: number }>(data: T[]) => {
  return Math.max(...data.map(d => d.value));
};

