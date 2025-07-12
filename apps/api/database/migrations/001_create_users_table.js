/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('workana_email', 255).notNullable().unique();
    table.string('workana_password', 255).notNullable();
    table.longtext('proposal_directives').notNullable();
    table.longtext('professional_profile').notNullable();
    table.string('telegram_user', 255).notNullable();
    table.longtext('workana_session_data');
    table.datetime('session_expires_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true);
    table.string('system_password', 255).notNullable();
    table.enum('role', ['ADMIN', 'USER']).notNullable().defaultTo('USER');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
}; 