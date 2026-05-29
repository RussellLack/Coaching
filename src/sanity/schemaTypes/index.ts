import { type SchemaTypeDefinition } from 'sanity'
import siteSettings from './siteSettings'
import hero from './hero'
import humanValue from './humanValue'
import journey from './journey'
import assessment from './assessment'
import archetype from './archetype'
import assessmentsIndexSettings from './assessmentsIndexSettings'
import submission from './submission'
import crossCombination from './crossCombination'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    siteSettings,
    hero,
    humanValue,
    journey,
    assessment,
    archetype,
    assessmentsIndexSettings,
    submission,
    crossCombination,
  ],
}
