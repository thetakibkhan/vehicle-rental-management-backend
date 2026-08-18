import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rentals', (table) => {
    table.increments('id').primary()
    table
      .integer('vehicle_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE')
    table.string('customer_name', 120).notNullable()
    table.string('customer_phone', 30).notNullable()
    table.date('start_date').notNullable()
    table.date('end_date').notNullable()
    table.decimal('total_amount', 12, 2).notNullable()
    table.string('status', 20).notNullable().defaultTo('booked')
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())

    table.index(['vehicle_id'], 'rentals_vehicle_id_index')
    table.index(['status'], 'rentals_status_index')
    table.index(
      ['vehicle_id', 'start_date', 'end_date'],
      'rentals_vehicle_date_range_index',
    )
  })

  await knex.raw(`
    ALTER TABLE rentals
    ADD CONSTRAINT rentals_total_amount_non_negative
    CHECK (total_amount >= 0)
  `)
  await knex.raw(`
    ALTER TABLE rentals
    ADD CONSTRAINT rentals_valid_date_range
    CHECK (end_date >= start_date)
  `)
  await knex.raw(`
    ALTER TABLE rentals
    ADD CONSTRAINT rentals_valid_status
    CHECK (status IN ('booked', 'ongoing', 'completed', 'cancelled'))
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rentals')
}
