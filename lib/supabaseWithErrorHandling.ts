import { supabase } from './supabase-client';
import { RefreshTokenHandler } from '@/utils/refreshTokenHandler';

/**
 * Wraps Supabase operations with automatic refresh token error handling
 */
export class SupabaseWithErrorHandling {
  /**
   * Wraps a Supabase operation with refresh token error handling
   */
  static async execute<T>(
    operation: () => Promise<T>,
    context: string = 'supabase_operation'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Check if this is a refresh token error
      const isRefreshTokenError = await RefreshTokenHandler.handleRefreshTokenError(error);
      
      if (isRefreshTokenError) {
        // Re-throw with a user-friendly message
        throw new Error('Your session has expired. Please sign in again.');
      }
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Auth operations with error handling
   */
  static auth = {
    signInWithPassword: (credentials: { email: string; password: string }) =>
      this.execute(
        () => supabase.auth.signInWithPassword(credentials),
        'sign_in'
      ),

    signUp: (credentials: { email: string; password: string; options?: any }) =>
      this.execute(
        () => supabase.auth.signUp(credentials),
        'sign_up'
      ),

    signOut: (options?: { scope?: 'local' | 'global' }) =>
      this.execute(
        () => supabase.auth.signOut(options),
        'sign_out'
      ),

    getSession: () =>
      this.execute(
        () => supabase.auth.getSession(),
        'get_session'
      ),

    getUser: () =>
      this.execute(
        () => supabase.auth.getUser(),
        'get_user'
      ),

    resetPasswordForEmail: (email: string, options?: any) =>
      this.execute(
        () => supabase.auth.resetPasswordForEmail(email, options),
        'reset_password'
      ),

    updateUser: (attributes: any) =>
      this.execute(
        () => supabase.auth.updateUser(attributes),
        'update_user'
      ),
  };

  /**
   * Database operations with error handling
   */
  static from = (table: string) => ({
    select: (columns = '*') =>
      this.execute(
        () => Promise.resolve(supabase.from(table).select(columns)),
        `select_${table}`
      ),

    insert: (data: any) =>
      this.execute(
        () => Promise.resolve(supabase.from(table).insert(data)),
        `insert_${table}`
      ),

    update: (data: any) => ({
      eq: (column: string, value: any) =>
        this.execute(
          () => Promise.resolve(supabase.from(table).update(data).eq(column, value)),
          `update_${table}`
        ),
    }),

    delete: () => ({
      eq: (column: string, value: any) =>
        this.execute(
          () => Promise.resolve(supabase.from(table).delete().eq(column, value)),
          `delete_${table}`
        ),
    }),
  });

  /**
   * RPC operations with error handling
   */
  static rpc = (functionName: string, params?: any) =>
    this.execute(
      () => Promise.resolve(supabase.rpc(functionName, params)),
      `rpc_${functionName}`
    );
}

/**
 * Enhanced Supabase client with automatic error handling
 */
export const supabaseSafe = SupabaseWithErrorHandling;
