// migrations/20250601_create_users_table.js

exports.up = function(knex) {
  return knex.schema.createTable('Users', table => {
    table.string('userId').primary();
    table.string('email').notNullable().unique();
    table.string('password').notNullable(); // hashed password
    table.string('displayName').nullable();
    table.jsonb('roles').notNullable().defaultTo(JSON.stringify(['user']));
    table.jsonb('apiKeys').nullable(); // array of active API keys
    table.jsonb('quota').nullable(); // { daily: Number, monthly: Number }
    table.jsonb('permissions').nullable(); // fine-grained permissions
    table.boolean('mfaEnabled').notNullable().defaultTo(false);
    table.string('passwordResetToken').nullable();
    table.timestamp('passwordResetExpiry').nullable();
    table.timestamp('lastPasswordChange').nullable();
    table.jsonb('profile').nullable(); // { avatarUrl, phone, address }
    table.string('organizationId').nullable();
    table.jsonb('auditLogs').nullable(); // array of audit log references
    table.timestamp('created').notNullable().defaultTo(knex.fn.now());
    table.timestamp('lastLogin').nullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.jsonb('emailVerified').nullable(); // { verified: Boolean, at: Date }
    table.jsonb('phoneVerified').nullable(); // { verified: Boolean, at: Date }
    table.string('locale').notNullable().defaultTo('en-US');
    table.string('timezone').notNullable().defaultTo('UTC');
    table.string('subscriptionPlan').nullable();
    table.string('accountStatus').notNullable().defaultTo('active');
    table.timestamp('lastFailedLogin').nullable();
    table.integer('failedLoginCount').notNullable().defaultTo(0);
    table.jsonb('notificationPreferences').nullable();
    table.jsonb('defaultQrSettings').nullable();
    table.timestamp('acceptedTermsAt').nullable();
    table.string('termsVersion').nullable();
    table.jsonb('activeSessions').nullable(); // array of session objects
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('Users');
};
