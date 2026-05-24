import { client } from '@/lib/sanity'
import HomeClient from './HomeClient'

async function getData() {
  const [siteSettings, hero, humanValues, journeys] = await Promise.all([
    client.fetch(`*[_type == "siteSettings"][0]`),
    client.fetch(`*[_type == "hero"][0]`),
    client.fetch(`*[_type == "humanValue"] | order(order asc)`),
    client.fetch(`*[_type == "journey"] | order(order asc)`),
  ])
  return { siteSettings, hero, humanValues, journeys }
}

export default async function Home() {
  const data = await getData()
  return <HomeClient {...data} />
}
