import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'humanValue',
  title: 'Human Value Pillar',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'body', title: 'Body', type: 'text' }),
    defineField({ name: 'order', title: 'Order', type: 'number' }),
  ],
  orderings: [
    { title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
})
