import type { CollectionConfig } from 'payload'

export const BillingEvents: CollectionConfig = {
  slug: 'billing-events',
  admin: { useAsTitle: 'eventId', defaultColumns: ['eventId', 'type', 'createdAt'], group: 'System' },
  access: { create: () => false, update: () => false, delete: () => false, read: ({ req }) => req.user?.collection === 'admins' },
  fields: [
    { name: 'eventId', type: 'text', required: true, unique: true, index: true },
    { name: 'type', type: 'text' },
    { name: 'reason', type: 'text' },
  ],
  versions: false,
}
