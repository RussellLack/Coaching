import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Site Title', type: 'string' }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string' }),
    defineField({ name: 'bookingEmail', title: 'Booking Email', type: 'string' }),
    defineField({ name: 'scanPrice', title: 'Deep Navigation Scan Price', type: 'string' }),
  ],
})
