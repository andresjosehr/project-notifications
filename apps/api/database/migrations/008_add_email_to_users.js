/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Agregar campo email para el sistema
    table.string('email', 255).notNullable().unique().after('id');
    
    // Renombrar system_password a password
    table.renameColumn('system_password', 'password');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Remover campo email
    table.dropColumn('email');
    
    // Renombrar password de vuelta a system_password
    table.renameColumn('password', 'system_password');
  });
}; 