import type { Access, CollectionConfig } from 'payload'

const isSelf: Access = ({ req }) =>
  req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false

const selfOrAdminRead: Access = (args) => (args.req.user?.collection === 'admins' ? true : isSelf(args))

const adminRead = (args: { req?: { user?: { collection?: string } | null } }) =>
  !!(args?.req?.user?.collection === 'admins')

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
    { name: 'provider', type: 'select', options: ['paystack', 'flutterwave'], access: { create: () => false, update: () => false, read: adminRead } },
    { name: 'customerRef', type: 'text', index: true, access: { create: () => false, update: () => false, read: () => false } },
    { name: 'subscriptionRef', type: 'text', access: { create: () => false, update: () => false, read: () => false } },
    { name: 'emailToken', type: 'text', access: { create: () => false, update: () => false, read: () => false } },
    { name: 'emailTokenExpires', type: 'date', access: { create: () => false, update: () => false, read: () => false } },
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      // Readable by the signed-in owner (and admins) so /api/app/auth/me can return it.
      // Never writable from the client; the server writes it with overrideAccess.
      access: { create: () => false, update: () => false, read: ({ req }) => !!req?.user },
    },
    { name: 'emailVerifiedAt', type: 'date', access: { create: () => false, update: () => false, read: adminRead } },
    { name: 'emailVerificationSource', type: 'text', access: { create: () => false, update: () => false, read: adminRead } },
    { name: 'billingStatus', type: 'select', options: ['none', 'active', 'past_due', 'canceled'], defaultValue: 'none', access: { create: () => false, update: () => false, read: adminRead } },
    { name: 'proUntil', type: 'date', access: { create: () => false, update: () => false, read: adminRead } },
    { name: 'cancelAtPeriodEnd', type: 'checkbox', defaultValue: false, access: { create: () => false, update: () => false, read: adminRead } },
    { name: 'presets', type: 'json', access: { create: () => false, update: () => false, read: () => false } },
  ],
  versions: false,
}