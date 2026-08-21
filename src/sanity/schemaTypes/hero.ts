import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'hero',
  title: 'Hero Section',
  type: 'document',
  fields: [
    defineField({ name: 'headline', title: 'Headline', type: 'localeString' }),
    defineField({ name: 'subheadline', title: 'Subheadline', type: 'localeString' }),
    defineField({ name: 'body', title: 'Body Text', type: 'localeText' }),
    defineField({ name: 'ctaLabel', title: 'CTA Button Label', type: 'localeString' }),
  ],
})
