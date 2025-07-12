/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('external_credentials', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('platform', 50).notNullable(); // 'workana', 'upwork', etc.
    table.string('email', 255).notNullable();
    table.string('password', 255).notNullable();
    table.longtext('session_data');
    table.datetime('session_expires_at');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('user_id', 'idx_user_id');
    table.index('platform', 'idx_platform');
    table.index(['user_id', 'platform'], 'idx_user_platform');
    
    // Clave foránea
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Índice único para evitar credenciales duplicadas por usuario y plataforma
    table.unique(['user_id', 'platform'], 'unique_user_platform');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('external_credentials');
}; 