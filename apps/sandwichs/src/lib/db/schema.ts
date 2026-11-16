import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const CATEGORIES = ['sandwich', 'boisson', 'dessert'] as const
export type Category = (typeof CATEGORIES)[number]

export const PAYMENT_METHODS = ['CB', 'Espèces', 'Ticket Restaurant'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const ORDER_STATUSES = ['confirmee', 'livree', 'annulee'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  category: text('category').$type<Category>().notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  priceCents: integer('price_cents').notNull(),
  // Sandwiches marked * on Bruno's menu can be part of the formule.
  formulaEligible: boolean('formula_eligible').notNull().default(false),
  // Choices the customer must pick from, e.g. Oasis flavors or cookie flavors.
  variants: jsonb('variants').$type<string[]>().notNull().default([]),
  active: boolean('active').notNull().default(true),
  position: integer('position').notNull().default(0),
})

// A row means Bruno opened that day for orders. Dates are Europe/Paris calendar days (YYYY-MM-DD).
export const serviceDays = pgTable('service_days', {
  date: text('date').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Single row (id = 1).
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  cutoffMinutes: integer('cutoff_minutes').notNull().default(600), // 10:00 Paris time
  deliveryWindow: text('delivery_window').notNull().default('12h – 13h'),
  minOrderCents: integer('min_order_cents').notNull().default(650),
  formulePriceCents: integer('formule_price_cents').notNull().default(650),
  // Unused since customers pick a delivery point (src/lib/delivery-points.ts); kept so older
  // deployments keep working while a new one rolls out.
  zoneLabel: text('zone_label').notNull().default('Sophia Antipolis'),
  zoneCenterLat: doublePrecision('zone_center_lat').notNull().default(43.615512),
  zoneCenterLon: doublePrecision('zone_center_lon').notNull().default(7.054762),
  zoneRadiusKm: doublePrecision('zone_radius_km').notNull().default(4),
})

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  serviceDate: text('service_date').notNull(),
  status: text('status').$type<OrderStatus>().notNull().default('confirmee'),
  // First name only since the form was simplified (older orders hold the full name).
  customerName: text('customer_name').notNull(),
  // No longer asked; only older orders have one.
  email: text('email'),
  phone: text('phone').notNull(),
  company: text('company').notNull().default(''),
  // Id from src/lib/delivery-points.ts; null on older orders, which had a free address.
  deliveryPointId: text('delivery_point_id'),
  // Snapshot of the delivery point (name + address) at order time.
  addressLabel: text('address_label').notNull(),
  addressDetails: text('address_details').notNull().default(''),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  paymentMethod: text('payment_method').$type<PaymentMethod>().notNull(),
  notes: text('notes').notNull().default(''),
  totalCents: integer('total_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
})

export const orderLines = pgTable('order_lines', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  kind: text('kind').$type<'produit' | 'formule'>().notNull(),
  // Snapshot shown to Bruno and the customer, e.g. "Formule : Poulet Mayo + Oasis (Cassis)".
  label: text('label').notNull(),
  productId: integer('product_id').notNull(),
  productName: text('product_name').notNull(),
  variant: text('variant'),
  drinkId: integer('drink_id'),
  drinkName: text('drink_name'),
  drinkVariant: text('drink_variant'),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
})

export type Product = typeof products.$inferSelect
export type Settings = typeof settings.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderLine = typeof orderLines.$inferSelect
