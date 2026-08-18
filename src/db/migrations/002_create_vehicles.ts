import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('vehicles', (table) => {
    table.increments('id').primary()
    table.string('name', 120).notNullable()
    table.string('plate_number', 50).notNullable().unique()
    table.string('category', 80).notNullable()
    table.decimal('daily_rate', 12, 2).notNullable()
    table.string('photo_path', 500).nullable()
    table.timestamp('deleted_at', { useTz: true }).nullable()
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())

    table.index(['category'], 'vehicles_category_index')
    table.index(['deleted_at'], 'vehicles_deleted_at_index')
  })

  await knex.raw(`
    ALTER TABLE vehicles
    ADD CONSTRAINT vehicles_daily_rate_non_negative
    CHECK (daily_rate >= 0)
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vehicles')
}
