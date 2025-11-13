// ID Generation utility for meaningful, user-friendly IDs

export class IDGenerator {
  // Generate Product ID: PRO-YYMMDD-XXX
  static async generateProductId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today from database
    const sequence = await this.getNextSequence('PRO', dateStr);
    
    return `PRO-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Raw Material ID: RM-YYMMDD-XXX
  static async generateRawMaterialId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today from database
    const sequence = await this.getNextSequence('RM', dateStr);
    
    return `RM-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Individual Product ID: IPD-YYMMDD-XXX
  static async generateIndividualProductId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today from database
    const sequence = await this.getNextSequence('IPD', dateStr);
    
    return `IPD-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate QR Code: QR-YYMMDD-XXX
  static async generateQRCode(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today from database
    const sequence = await this.getNextSequence('QR', dateStr);
    
    return `QR-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Waste ID: WASTE-YYMMDD-XXX
  static async generateWasteId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Get next sequence number for today from database
    const sequence = await this.getNextSequence('WASTE', dateStr);
    
    return `WASTE-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Customer ID: CUST-XXX (simple sequential, no date)
  static async generateCustomerId(): Promise<string> {
    // Get next sequence number globally from database
    const sequence = await this.getNextGlobalSequence('CUST');

    return `CUST-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Recipe ID: RECIPE-YYMMDD-XXX
  static async generateRecipeId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Get next sequence number for today from database
    const sequence = await this.getNextSequence('RECIPE', dateStr);

    return `RECIPE-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate Recipe Material ID: RECMAT-YYMMDD-XXX
  static async generateRecipeMaterialId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Get next sequence number for today from database
    const sequence = await this.getNextSequence('RECMAT', dateStr);

    return `RECMAT-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Get next sequence number using database function (atomic operation)
  private static async getNextSequence(prefix: string, dateStr: string): Promise<number> {
    try {
      // Import the centralized supabase client to avoid multiple instances
      const { supabase } = await import('@/lib/supabase');
      
      if (!supabase) {
        // Fallback to timestamp-based sequence if no Supabase config
        return parseInt(Date.now().toString().slice(-3));
      }
      
      // Use the database function to atomically get next sequence
      const { data, error } = await supabase.rpc('get_next_sequence', {
        p_prefix: prefix,
        p_date_str: dateStr
      });
      
      if (error) {
        console.warn(`Error calling get_next_sequence function: ${error.message}`);
        // Check if it's a network error and provide more specific logging
        if (error.message?.includes('Load failed') || error.message?.includes('network')) {
          console.warn('Network connection issue detected, using fallback ID generation');
        }
        // Fallback to timestamp-based sequence
        return parseInt(Date.now().toString().slice(-3));
      }
      
      return data || 1;
      
    } catch (error) {
      console.warn(`Error getting sequence from database: ${error}`);
      // Fallback to timestamp-based sequence
      return parseInt(Date.now().toString().slice(-3));
    }
  }

  // Get next sequence for global sequences (no date component)
  private static async getNextGlobalSequence(prefix: string): Promise<number> {
    try {
      // Import the centralized supabase client to avoid multiple instances
      const { supabase } = await import('@/lib/supabase');
      
      if (!supabase) {
        // Fallback to timestamp-based sequence if no Supabase config
        return parseInt(Date.now().toString().slice(-3));
      }
      
      // Use the database function to atomically get next global sequence
      const { data, error } = await supabase.rpc('get_next_global_sequence', {
        p_prefix: prefix
      });
      
      if (error) {
        console.warn(`Error calling get_next_global_sequence function: ${error.message}`);
        // Check if it's a network error and provide more specific logging
        if (error.message?.includes('Load failed') || error.message?.includes('network')) {
          console.warn('Network connection issue detected, using fallback ID generation');
        }
        // Fallback to timestamp-based sequence
        return parseInt(Date.now().toString().slice(-3));
      }
      
      return data || 1;
      
    } catch (error) {
      console.warn(`Error getting global sequence from database: ${error}`);
      // Fallback to timestamp-based sequence
      return parseInt(Date.now().toString().slice(-3));
    }
  }


  // Generate globally unique Individual Product ID using database function
  static async generateUniqueIndividualProductId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('IPD', dateStr);
    return `IPD-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate a simple individual product ID without database checks (for high-concurrency scenarios)
  static generateIndividualProductIdSimple(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Use timestamp + random number for uniqueness
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `IPD-${dateStr}-${timestamp}${random}`;
  }

  // Generate globally unique Product ID using database function
  static async generateUniqueProductId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('PRO', dateStr);
    return `PRO-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Order ID using database function
  static async generateUniqueOrderId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('ORD', dateStr);
    return `ORD-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Customer ID using database function
  static async generateUniqueCustomerId(): Promise<string> {
    const sequence = await this.getNextGlobalSequence('CUST');
    return `CUST-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Raw Material ID using database function
  static async generateUniqueRawMaterialId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('RM', dateStr);
    return `RM-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Production Flow ID using database function
  static async generateUniqueProductionFlowId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('FLOW', dateStr);
    return `FLOW-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Production Batch ID using database function
  static async generateUniqueProductionBatchId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('BATCH', dateStr);
    return `BATCH-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Waste ID using database function
  static async generateUniqueWasteId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('WASTE', dateStr);
    return `WASTE-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Recipe ID using database function
  static async generateUniqueRecipeId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('RECIPE', dateStr);
    return `RECIPE-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Recipe Material ID using database function
  static async generateUniqueRecipeMaterialId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('RECMAT', dateStr);
    return `RECMAT-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Purchase Order ID using database function
  static async generateUniquePurchaseOrderId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('PO', dateStr);
    return `PO-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  // Generate globally unique Supplier ID using database function
  static async generateUniqueSupplierId(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const sequence = await this.getNextSequence('SUP', dateStr);
    return `SUP-${dateStr}-${sequence.toString().padStart(3, '0')}`;
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

// Legacy function for backward compatibility (now async)
export const generateUniqueId = async (prefix: string = ''): Promise<string> => {
  switch (prefix.toUpperCase()) {
    case 'PROD':
    case 'PRO':
      return await IDGenerator.generateProductId();
    case 'RM':
      return await IDGenerator.generateRawMaterialId();
    case 'IND':
    case 'IPD':
      return await IDGenerator.generateIndividualProductId();
    case 'QR':
      return await IDGenerator.generateQRCode();
    case 'CUST':
    case 'CUSTOMER':
      return await IDGenerator.generateCustomerId();
    case 'RECIPE':
      return await IDGenerator.generateRecipeId();
    case 'RECMAT':
      return await IDGenerator.generateRecipeMaterialId();
    default:
      // Fallback to old method for unknown prefixes
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substr(2, 9);
      return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
  }
};
