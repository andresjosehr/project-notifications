/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Remover columnas relacionadas con Workana
    table.dropColumn('workana_email');
    table.dropColumn('workana_password');
    table.dropColumn('workana_session_data');
    table.dropColumn('session_expires_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Restaurar columnas de Workana
    table.string('workana_email', 255);
    table.string('workana_password', 255);
    table.longtext('workana_session_data');
    table.datetime('session_expires_at');
  });
}; 