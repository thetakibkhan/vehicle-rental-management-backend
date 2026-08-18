import type { Knex } from 'knex'

interface SeededVehicle {
  id: number
  plate_number: string
}

export async function seed(knex: Knex): Promise<void> {
  await knex('rentals').delete()
  await knex('vehicles').delete()

  const vehicles = await knex('vehicles')
    .insert([
      {
        name: 'Toyota Corolla',
        plate_number: 'DHAKA-METRO-GA-11-1001',
        category: 'sedan',
        daily_rate: 70,
      },
      {
        name: 'Toyota Hiace',
        plate_number: 'DHAKA-METRO-CHA-11-2001',
        category: 'microbus',
        daily_rate: 110,
      },
    ])
    .returning<SeededVehicle[]>(['id', 'plate_number'])

  const sedan = vehicles.find(
    (vehicle) => vehicle.plate_number === 'DHAKA-METRO-GA-11-1001',
  )
  const microbus = vehicles.find(
    (vehicle) => vehicle.plate_number === 'DHAKA-METRO-CHA-11-2001',
  )

  if (sedan === undefined || microbus === undefined) {
    throw new Error('Fleet seed failed to return inserted vehicles')
  }

  await knex('rentals').insert([
    {
      vehicle_id: sedan.id,
      customer_name: 'Rahim Ahmed',
      customer_phone: '+8801700000001',
      start_date: '2026-07-29',
      end_date: '2026-08-03',
      total_amount: 420,
      status: 'completed',
    },
    {
      vehicle_id: microbus.id,
      customer_name: 'Karim Hasan',
      customer_phone: '+8801700000002',
      start_date: '2026-08-15',
      end_date: '2026-08-15',
      total_amount: 110,
      status: 'booked',
    },
  ])
}
