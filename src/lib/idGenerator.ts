// ID Generation utility for meaningful, user-friendly IDs

export class IDGenerator {
  // Generate Product ID: PRO-YYMMDD-XXX
  static generateProductId(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today
    const sequence = this.getNextSequence('PRO', dateStr);
    
    return `PRO-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Raw Material ID: RM-YYMMDD-XXX
  static generateRawMaterialId(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today
    const sequence = this.getNextSequence('RM', dateStr);
    
    return `RM-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Individual Product ID: IPD-YYMMDD-XXX
  static generateIndividualProductId(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today
    const sequence = this.getNextSequence('IPD', dateStr);
    
    return `IPD-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate QR Code: QR-YYMMDD-XXX
  static generateQRCode(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Get next sequence number for today
    const sequence = this.getNextSequence('QR', dateStr);

    return `QR-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Customer ID: CUST-XXX (simple sequential, no date)
  static generateCustomerId(): string {
    // Get next sequence number globally (no date component)
    const sequence = this.getNextSequence('CUST', 'global');

    return `CUST-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Recipe ID: RECIPE-YYMMDD-XXX
  static generateRecipeId(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Get next sequence number for today
    const sequence = this.getNextSequence('RECIPE', dateStr);

    return `RECIPE-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Recipe Material ID: RECMAT-YYMMDD-XXX
  static generateRecipeMaterialId(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Get next sequence number for today
    const sequence = this.getNextSequence('RECMAT', dateStr);

    return `RECMAT-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Get next sequence number for a given prefix and date
  private static getNextSequence(prefix: string, dateStr: string): number {
    // Use localStorage for sequence management (no database dependency)
    const storageKey = `id_sequence_${prefix}_${dateStr}`;
    const existingSequence = localStorage.getItem(storageKey);
    
    if (existingSequence) {
      const nextSequence = parseInt(existingSequence) + 1;
      localStorage.setItem(storageKey, nextSequence.toString());
      return nextSequence;
    } else {
      // First sequence for this prefix and date
      localStorage.setItem(storageKey, '1');
      return 1;
    }
  }

  // Parse ID to get information
  static parseId(id: string): { type: string; date: string; sequence: number } | null {
    const match = id.match(/^([A-Z]+)-(\d{6})-(\d{3})$/);
    if (!match) return null;

    const [, type, dateStr, sequenceStr] = match;
    const year = `20${dateStr.slice(0, 2)}`;
    const month = dateStr.slice(2, 4);
    const day = dateStr.slice(4, 6);
    
    return {
      type,
      date: `${year}-${month}-${day}`,
      sequence: parseInt(sequenceStr)
    };
  }

  // Get human-readable date from ID
  static getDateFromId(id: string): string | null {
    const parsed = this.parseId(id);
    if (!parsed) return null;
    
    const date = new Date(parsed.date);
    return date.toLocaleDateString();
  }

  // Get type description from ID
  static getTypeDescription(id: string): string {
    const match = id.match(/^([A-Z]+)-/);
    if (!match) return 'Unknown';

    const type = match[1];
    switch (type) {
      case 'PRO': return 'Product';
      case 'RM': return 'Raw Material';
      case 'IPD': return 'Individual Product';
      case 'QR': return 'QR Code';
      case 'CUST': return 'Customer';
      case 'RECIPE': return 'Recipe';
      case 'RECMAT': return 'Recipe Material';
      default: return type;
    }
  }
}

// Legacy function for backward compatibility
export const generateUniqueId = (prefix: string = ''): string => {
  switch (prefix.toUpperCase()) {
    case 'PROD':
    case 'PRO':
      return IDGenerator.generateProductId();
    case 'RM':
      return IDGenerator.generateRawMaterialId();
    case 'IND':
    case 'IPD':
      return IDGenerator.generateIndividualProductId();
    case 'QR':
      return IDGenerator.generateQRCode();
    case 'CUST':
    case 'CUSTOMER':
      return IDGenerator.generateCustomerId();
    case 'RECIPE':
      return IDGenerator.generateRecipeId();
    case 'RECMAT':
      return IDGenerator.generateRecipeMaterialId();
    default:
      // Fallback to old method for unknown prefixes
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substr(2, 9);
      return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
  }
};
