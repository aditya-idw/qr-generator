// migrations/20250603_add_roles_to_users.js

exports.up = async function(knex) {
  // Only add the column if it doesn't already exist
  const hasRoles = await knex.schema.hasColumn('Users', 'roles');
  if (!hasRoles) {
    await knex.schema.alterTable('Users', table => {
      table
        .jsonb('roles')
        .notNullable()
        .defaultTo(knex.raw(`'["user"]'::jsonb`));
    });
  }
};

exports.down = async function(knex) {
  // Only drop the column if it exists
  const hasRoles = await knex.schema.hasColumn('Users', 'roles');
  if (hasRoles) {
    await knex.schema.alterTable('Users', table => {
      table.dropColumn('roles');
    });
  }
};
