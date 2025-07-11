/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('projects', function(table) {
    table.increments('id').primary();
    table.longtext('title');
    table.longtext('description');
    table.longtext('price');
    table.longtext('skills');
    table.string('link', 255);
    table.enum('platform', ['workana', 'upwork']).notNullable();
    table.string('language', 10);
    table.string('client_name', 255);
    table.string('client_country', 100);
    table.decimal('client_rating', 3, 2);
    table.boolean('payment_verified').defaultTo(false);
    table.boolean('is_featured').defaultTo(false);
    table.boolean('is_max_project').defaultTo(false);
    table.string('date', 50);
    table.string('time_ago', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now()).onUpdate(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('projects');
}; 