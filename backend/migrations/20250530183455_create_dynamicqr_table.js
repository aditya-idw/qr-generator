// migrations/20250530183455_create_dynamicqr_table.js

exports.up = function(knex) {
  return knex.schema.createTable('DynamicQR', table => {
    table.string('id').primary();                     // short key
    table.string('url').notNullable();                // original payload URL
    table.integer('hits').notNullable().defaultTo(0); // redirect count
    table.timestamp('created').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expiry').nullable();

    table.integer('clickCap').nullable();
    table.jsonb('rateLimit').nullable();              // { count, perMilliseconds }

    table.boolean('passwordProtected').notNullable().defaultTo(false);
    table.string('password').nullable();

    table.jsonb('geoFence').nullable();               // { allowedRegions, redirectUrl/fallbackUrl }
    table.jsonb('deviceRouting').nullable();          // { mobileUrl, desktopUrl }
    table.string('fallbackUrl').nullable();

    table.jsonb('timeRouting').nullable();            // { businessHoursUrl, afterHoursUrl, weekendsUrl }
    table.jsonb('authProviders').nullable();          // e.g. ["Google","Facebook"]
    table.string('webhookUrl').nullable();

    table.jsonb('abTestGroups').nullable();           // [ "url1", "url2", … ]
    table.jsonb('ipAllowList').nullable();            // [ "1.2.3.4", … ]
    table.boolean('captchaEnabled').notNullable().defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('DynamicQR');
};
