import type { CollectionConfig } from 'payload'

export const UsageProjects: CollectionConfig = {
  slug: 'usage-projects',
  admin: { useAsTitle: 'month', defaultColumns: ['user', 'month', 'count'], group: 'System' },
  access: {
    create: ({ req }) => req.user?.collection === 'admins',
    read: ({ req }) => req.user?.collection === 'admins',
    update: () => false,
    delete: () => false,
    admin: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'month', type: 'text', required: true, index: true },
    { name: 'count', type: 'number', required: true, defaultValue: 0 },
  ],
  indexes: [
    { fields: ['user', 'month'], unique: true },
  ],
  versions: false,
}