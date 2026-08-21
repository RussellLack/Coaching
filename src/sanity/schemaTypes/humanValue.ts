import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'humanValue',
  title: 'Human Value Pillar',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'localeString' }),
    defineField({ name: 'body', title: 'Body', type: 'localeText' }),
    defineField({ name: 'order', title: 'Order', type: 'number' }),
  ],
  orderings: [
    { title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title.en', order: 'order' },
    prepare: ({ title, order }) => ({ title: title ?? '(untitled)', subtitle: `#${order ?? '?'}` }),
  },
})
