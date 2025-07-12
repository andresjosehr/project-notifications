/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('registration_tokens', function(table) {
    table.increments('id').primary();
    table.string('token', 255).notNullable().unique();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('used_at').nullable();
    table.integer('created_by_admin').unsigned().nullable();
    table.integer('registered_user_id').unsigned().nullable();
    
    // Indexes
    table.index('token');
    table.index('is_used');
    
    // Foreign key constraints
    table.foreign('registered_user_id').references('id').inTable('users').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('registration_tokens');
};