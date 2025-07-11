/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    INSERT INTO external_credentials (user_id, platform, email, password, session_data, session_expires_at, is_active, created_at, updated_at)
    SELECT 
      id as user_id,
      'workana' as platform,
      workana_email as email,
      workana_password as password,
      workana_session_data as session_data,
      session_expires_at,
      is_active,
      created_at,
      updated_at
    FROM users 
    WHERE workana_email IS NOT NULL 
    AND workana_email != ''
    AND workana_password IS NOT NULL 
    AND workana_password != ''
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex('external_credentials').where('platform', 'workana').del();
}; 