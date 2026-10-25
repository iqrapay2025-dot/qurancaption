import type { Access, CollectionConfig } from 'payload'

const ownerOnly: Access = ({ req }) =>
  req.user?.collection === 'users' ? { owner: { equals: req.user.id } } : false

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'surah', 'updatedAt'] },
  access: {
    create: ({ req }) => req.user?.collection === 'users',
    read: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user?.collection === 'users') data.owner = req.user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: () => false },
      admin: { position: 'sidebar' },
    },
    { name: 'surah', type: 'number', required: true, min: 1, max: 114 },
    { name: 'fromAyah', type: 'number', required: true, min: 1 },
    {
      name: 'toAyah',
      type: 'number',
      required: true,
      min: 1,
      validate: (value: number | null | undefined, { siblingData }: { siblingData: { fromAyah?: number } }) =>
        value != null && siblingData?.fromAyah != null && value < siblingData.fromAyah
          ? 'End ayah must not be before the start ayah'
          : true,
    },
    { name: 'ranges', type: 'json', admin: { description: 'All queued ayah ranges (empty for a single-range project).' } },
    { name: 'layers', type: 'json', required: true },
    { name: 'translations', type: 'json', required: true },
    { name: 'reciterId', type: 'number' },
    { name: 'style', type: 'json', required: true },
    { name: 'ratio', type: 'select', options: ['9:16', '16:9', '1:1'], defaultValue: '9:16' },
    { name: 'thumbnail', type: 'textarea', admin: { hidden: true } },
  ],
  versions: false,
}
