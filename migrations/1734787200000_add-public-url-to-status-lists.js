export const up = async (pgm) => {
  pgm.addColumn('status_lists', {
    public_url: {
      type: 'text',
      unique: true,
      notNull: false
    }
  });

  pgm.createIndex('status_lists', 'public_url', {
    name: 'idx_status_lists_public_url',
    unique: true,
    ifNotExists: true
  });
};

export const down = async (pgm) => {
  pgm.dropIndex('status_lists', 'public_url', {
    name: 'idx_status_lists_public_url',
    ifNotExists: true
  });

  pgm.dropColumn('status_lists', 'public_url');
};

