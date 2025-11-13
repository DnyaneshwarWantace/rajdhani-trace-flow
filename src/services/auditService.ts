import { supabase, handleSupabaseError, AuditLog } from '@/lib/supabase';
import { IDGenerator } from '@/lib/idGenerator';

export class AuditService {
  // Log audit entry
  static async logAudit(
    action: string,
    tableName: string,
    recordId: string,
    oldValues?: any,
    newValues?: any,
    userId: string = 'admin'
  ): Promise<{ success: boolean; error: string | null }> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        
        // Generate unique audit log ID using database function
        const auditId = await AuditService.generateAuditLogId();
        
        const auditData = {
          id: auditId,
          action: action.toLowerCase().replace(/\s+/g, '_'),
          table_name: tableName,
          record_id: recordId, // Use record_id as expected by database
          old_values: oldValues ? JSON.stringify(oldValues) : null,
          new_values: newValues ? JSON.stringify(newValues) : null,
          user_id: userId,
          timestamp: new Date().toISOString(),
          // Also populate legacy fields for compatibility
          module: tableName,
          entity_id: recordId,
          entity_name: recordId,
          previous_state: oldValues ? JSON.stringify(oldValues) : null,
          new_state: newValues ? JSON.stringify(newValues) : null
        };

        console.log(`🔍 Logging audit (attempt ${attempts}/${maxAttempts}):`, auditData);

        const { error } = await supabase
          .from('audit_logs')
          .insert(auditData);

        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505' && error.message.includes('duplicate key value violates unique constraint')) {
            console.warn(`⚠️ Duplicate key error on attempt ${attempts}, retrying with new ID...`);
            
            if (attempts < maxAttempts) {
              // Add a small delay before retry
              await new Promise(resolve => setTimeout(resolve, 100 * attempts));
              continue; // Retry with new ID
            } else {
              console.error('❌ Max retries reached for duplicate key error');
              return { success: false, error: `Failed to log audit after ${maxAttempts} attempts due to duplicate key conflicts` };
            }
          }
          
          console.error('❌ Error logging audit:', error);
          return { success: false, error: handleSupabaseError(error) };
        }

        console.log(`✅ Audit logged: ${action} in ${tableName} for record ${recordId}`);
        return { success: true, error: null };

      } catch (error) {
        console.error(`❌ Exception in logAudit (attempt ${attempts}):`, error);
        
        if (attempts >= maxAttempts) {
          return { success: false, error: 'Failed to log audit entry' };
        }
        
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
      }
    }
    
    return { success: false, error: `Failed to log audit after ${maxAttempts} attempts` };
  }

  // Generate unique audit log ID using database function
  private static async generateAuditLogId(): Promise<string> {
    try {
      // Import the centralized supabase client to avoid multiple instances
      const { supabase } = await import('@/lib/supabase');
      
      if (!supabase) {
        // Fallback to timestamp-based ID if no Supabase config
        const timestamp = Date.now().toString().slice(-6);
        return `AUDIT-${timestamp}`;
      }
      
      // Use the database function to atomically get next sequence for audit logs
      const { data, error } = await supabase.rpc('get_next_sequence', {
        p_prefix: 'AUDIT',
        p_date_str: new Date().toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD format
      });
      
      if (error) {
        console.warn(`Error calling get_next_sequence function for audit: ${error.message}`);
        // Fallback to timestamp-based ID
        const timestamp = Date.now().toString().slice(-6);
        return `AUDIT-${timestamp}`;
      }
      
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      
      return `AUDIT-${dateStr}-${(data || 1).toString().padStart(3, '0')}`;
      
    } catch (error) {
      console.warn(`Error generating audit log ID: ${error}`);
      // Fallback to timestamp-based ID
      const timestamp = Date.now().toString().slice(-6);
      return `AUDIT-${timestamp}`;
    }
  }

  // Get audit logs with filtering
  static async getAuditLogs(filters?: {
    table_name?: string;
    action?: string;
    user_id?: string;
    record_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AuditLog[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Apply filters
      if (filters?.table_name && filters.table_name !== 'all') {
        query = query.eq('table_name', filters.table_name);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.record_id) {
        query = query.eq('record_id', filters.record_id);
      }

      if (filters?.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching audit logs:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('❌ Exception in getAuditLogs:', error);
      return { data: null, error: 'Failed to fetch audit logs' };
    }
  }

  // Get audit trail for a specific record
  static async getRecordAuditTrail(recordId: string, tableName?: string): Promise<{ data: AuditLog[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('record_id', recordId)
        .order('timestamp', { ascending: false });

      if (tableName) {
        query = query.eq('table_name', tableName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching record audit trail:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('❌ Exception in getRecordAuditTrail:', error);
      return { data: null, error: 'Failed to fetch record audit trail' };
    }
  }

  // Clean up old audit logs (keep only recent ones for performance)
  static async cleanupOldAuditLogs(daysToKeep: number = 365): Promise<{ success: boolean; error: string | null; deletedCount?: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('❌ Error cleaning up old audit logs:', error);
        return { success: false, error: handleSupabaseError(error) };
      }

      const deletedCount = data?.length || 0;
      console.log(`🧹 Deleted ${deletedCount} old audit logs (older than ${daysToKeep} days)`);
      return { success: true, error: null, deletedCount };

    } catch (error) {
      console.error('❌ Exception in cleanupOldAuditLogs:', error);
      return { success: false, error: 'Failed to cleanup old audit logs' };
    }
  }
}

// Export convenience function for easy import in other services
export const logAudit = AuditService.logAudit;

export default AuditService;