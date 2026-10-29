import type { CollectionConfig } from 'payload'

export const UsageVerses: CollectionConfig = {
  slug: 'usage-verses',
  admin: { useAsTitle: 'verseKey', defaultColumns: ['user', 'month', 'verseKey', 'createdAt'], group: 'System' },
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
    { name: 'verseKey', type: 'text', required: true },
  ],
  indexes: [
    { fields: ['user', 'month', 'verseKey'], unique: true },
  ],
  versions: false,
}