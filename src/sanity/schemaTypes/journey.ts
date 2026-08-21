import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'journey',
  title: 'Coaching Journey',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'localeString' }),
    defineField({ name: 'description', title: 'Description', type: 'localeText' }),
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
