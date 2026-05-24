import { type SchemaTypeDefinition } from 'sanity'
import siteSettings from './siteSettings'
import hero from './hero'
import humanValue from './humanValue'
import journey from './journey'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [siteSettings, hero, humanValue, journey],
}
