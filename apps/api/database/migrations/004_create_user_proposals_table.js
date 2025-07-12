/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('user_proposals', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('project_id').notNullable();
    table.enum('project_platform', ['workana', 'upwork']).notNullable().defaultTo('workana');
    table.datetime('proposal_sent_at').notNullable().defaultTo(knex.fn.now());
    table.longtext('proposal_content');
    table.enum('status', ['sent', 'accepted', 'rejected', 'pending']).defaultTo('sent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Clave única compuesta
    table.unique(['user_id', 'project_id', 'project_platform'], 'user_project_unique');
    
    // Clave foránea
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('user_proposals');
}; 