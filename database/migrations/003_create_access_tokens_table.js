/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('access_tokens', function(table) {
    table.increments('id').primary();
    table.string('token', 255).notNullable().unique();
    table.integer('project_id').notNullable();
    table.enum('platform', ['workana', 'upwork']).notNullable();
    table.integer('user_id').notNullable();
    table.datetime('expires_at').notNullable();
    table.datetime('used_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('token', 'idx_token');
    table.index('expires_at', 'idx_expires');
    table.index('user_id', 'user_id');
    
    // Clave foránea
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('access_tokens');
}; 