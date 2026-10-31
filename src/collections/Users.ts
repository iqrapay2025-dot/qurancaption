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
    { name: 'provider', type: 'select', options: ['paystack', 'stripe', 'flutterwave'], access: serverOnly },
    { name: 'customerRef', type: 'text', index: true, access: serverOnly },
    { name: 'subscriptionRef', type: 'text', access: serverOnly },
    { name: 'emailToken', type: 'text', access: serverOnly },
    { name: 'billingStatus', type: 'select', options: ['none', 'active', 'past_due', 'canceled'], defaultValue: 'none', access: serverOnly },
    { name: 'proUntil', type: 'date', access: serverOnly },
    { name: 'cancelAtPeriodEnd', type: 'checkbox', defaultValue: false, access: serverOnly },
    { name: 'presets', type: 'json', access: serverOnly },
  ],
  versions: false,
}
