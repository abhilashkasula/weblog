exports.up = function (knex) {
  return knex.schema.createTable('stories', (table) => {
    table.increments();
    table.text('title').notNullable();
    table.integer('created_by').notNullable();
    table.text('content').notNullable();
    table.integer('is_published').default(0);
    table.timestamp('last_modified').notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('stories');
};