/**
 * Migration: Create status_lists and audit_logs tables
 * 
 * This migration creates the core tables for managing StatusList2021 credentials:
 * - status_lists: Stores the bitstring and metadata for each status list
 * - audit_logs: Tracks all operations (allocate, revoke, unrevoke) on status indices
 */

export async function up(pgm) {
  // Create status_lists table
  pgm.createTable('status_lists', {
    id: {
      type: 'varchar(255)',
      primaryKey: true,
      notNull: true,
      comment: 'Unique identifier for the status list (e.g., slu-degree-2025)',
    },
    next_index: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Next available bit position in the status list',
    },
    encoded_list: {
      type: 'text',
      notNull: true,
      comment: 'Base64url-encoded compressed bitstring (GZIP + base64url)',
    },
    size: {
      type: 'integer',
      notNull: true,
      default: 16384,
      comment: 'Total size of the bitstring in bits',
    },
    status_purpose: {
      type: 'varchar(50)',
      notNull: true,
      default: 'revocation',
      comment: 'Purpose of this status list: revocation or suspension',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create audit_logs table
  pgm.createTable('audit_logs', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    list_id: {
      type: 'varchar(255)',
      notNull: true,
      references: 'status_lists(id)',
      onDelete: 'CASCADE',
      comment: 'Reference to the status list',
    },
    credential_index: {
      type: 'integer',
      notNull: true,
      comment: 'The bit index in the status list',
    },
    credential_id: {
      type: 'varchar(512)',
      comment: 'Optional credential ID for tracking',
    },
    action: {
      type: 'varchar(20)',
      notNull: true,
      check: "action IN ('allocate', 'revoke', 'unrevoke')",
      comment: 'Action performed: allocate, revoke, or unrevoke',
    },
    metadata: {
      type: 'jsonb',
      comment: 'Additional metadata (reason, actor, etc.)',
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create indexes for better query performance
  pgm.createIndex('audit_logs', 'list_id', {
    name: 'idx_audit_logs_list_id',
  });

  pgm.createIndex('audit_logs', 'credential_index', {
    name: 'idx_audit_logs_credential_index',
  });

  pgm.createIndex('audit_logs', 'timestamp', {
    name: 'idx_audit_logs_timestamp',
  });

  // Create function to auto-update updated_at timestamp
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create trigger to auto-update updated_at on status_lists
  pgm.sql(`
    CREATE TRIGGER update_status_lists_updated_at
      BEFORE UPDATE ON status_lists
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(pgm) {
  pgm.dropTable('audit_logs', { ifExists: true, cascade: true });
  pgm.dropTable('status_lists', { ifExists: true, cascade: true });
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
}

