import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'journey',
  title: 'Coaching Journey',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({ name: 'order', title: 'Order', type: 'number' }),
  ],
  orderings: [
    { title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
})
