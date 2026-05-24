import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'hero',
  title: 'Hero Section',
  type: 'document',
  fields: [
    defineField({ name: 'headline', title: 'Headline', type: 'string' }),
    defineField({ name: 'subheadline', title: 'Subheadline', type: 'string' }),
    defineField({ name: 'body', title: 'Body Text', type: 'text' }),
    defineField({ name: 'ctaLabel', title: 'CTA Button Label', type: 'string' }),
  ],
})
