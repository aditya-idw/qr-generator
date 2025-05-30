// migrations/20250602_create_api_keys_table.js

exports.up = function(knex) {
  return knex.schema.createTable('ApiKeys', table => {
    // Primary key for the API-key record:
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Use .string() to match Users.userId (varchar)
    table.string('userId').notNullable()
      .references('userId')
      .inTable('Users')
      .onDelete('CASCADE');

    table.string('key').notNullable().unique();
    table.timestamp('created').notNullable().defaultTo(knex.fn.now());
    table.boolean('revoked').notNullable().defaultTo(false);
    table.timestamp('revokedAt').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ApiKeys');
};
