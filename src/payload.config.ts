import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Projects } from './collections/Projects'
import { BillingEvents } from './collections/BillingEvents'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
  pool: { connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL },
}),
  editor: lexicalEditor(),
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    importMap: { baseDir: path.resolve(dirname) },
  },
  i18n: { fallbackLanguage: 'en', supportedLanguages: { en: adminLanguage } },
  collections: [Admins, Media, Folders, Tags, Users, Projects, BillingEvents],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  localization: { locales: [{ code: 'en', label: 'English' }], fallback: true, defaultLocale: 'en' },
storage: process.env.BLOB_READ_WRITE_TOKEN
  ? [
      vercelBlobStorage({
        collections: { media: true },
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }),
    ]
  : [],
})