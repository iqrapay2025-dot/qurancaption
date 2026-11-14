import type { CollectionConfig } from 'payload'

export const UsageAutoTime: CollectionConfig = {
  slug: 'usage-auto-time',
  admin: { useAsTitle: 'month', defaultColumns: ['user', 'month', 'count'] },
  access: {
    create: ({ req }) => req.user?.collection === 'admins',
    read: ({ req }) => req.user?.collection === 'admins',
    update: ({ req }) => req.user?.collection === 'admins',
    delete: ({ req }) => req.user?.collection === 'admins',
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'month', type: 'text', required: true },
    { name: 'count', type: 'number', defaultValue: 0, required: true },
  ],
  indexes: [{ fields: ['user', 'month'], unique: true }],
  timestamps: true,
}