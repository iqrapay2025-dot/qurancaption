import type { Access, CollectionConfig } from 'payload'

const isSelf: Access = ({ req }) =>
  req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false

const selfOrAdminRead: Access = (args) => (args.req.user?.collection === 'admins' ? true : isSelf(args))

const serverOnly = { create: () => false, update: () => false, read: () => false }

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'name', 'createdAt'] },
  auth: { tokenExpiration: 60 * 60 * 24 * 30 },
  access: {
    create: () => true,
    read: selfOrAdminRead,
    update: isSelf,
    delete: isSelf,
    admin: () => false,
  },
  fields: [
    { name: 'name', type: 'text', maxLength: 80 },
    {
      name: 'googleId',
      type: 'text',
      unique: true,
      index: true,
      access: { create: () => false, update: () => false, read: () => false },
    },
    { name: 'provider', type: 'select', options: ['paystack', 'stripe', 'flutterwave'], access: { create: () => false, update: () => false, read: (args) => !!(args?.req?.user?.collection === 'admins') } },
    { name: 'customerRef', type: 'text', index: true, access: { create: () => false, update: () => false, read: () => false } },
    { name: 'subscriptionRef', type: 'text', access: { create: () => false, update: () => false, read: () => false } },
    { name: 'emailToken', type: 'text', access: { create: () => false, update: () => false, read: () => false } },
    { name: 'billingStatus', type: 'select', options: ['none', 'active', 'past_due', 'canceled'], defaultValue: 'none', access: { create: () => false, update: () => false, read: (args) => !!(args?.req?.user?.collection === 'admins') } },
    { name: 'proUntil', type: 'date', access: { create: () => false, update: () => false, read: (args) => !!(args?.req?.user?.collection === 'admins') } },
    { name: 'cancelAtPeriodEnd', type: 'checkbox', defaultValue: false, access: { create: () => false, update: () => false, read: (args) => !!(args?.req?.user?.collection === 'admins') } },
    { name: 'presets', type: 'json', access: { create: () => false, update: () => false, read: () => false } },
  ],
  versions: false,
}
