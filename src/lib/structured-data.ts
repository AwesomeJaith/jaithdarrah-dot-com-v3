// Schema.org types for JSON-LD structured data
interface SchemaBase {
  "@context": string
  "@type": string
}

interface Article extends SchemaBase {
  "@type": "Article"
  headline: string
  description: string
  author: PersonOrOrganization
  publisher: PersonOrOrganization
  datePublished: string
  dateModified: string
  url: string
  image: string
  mainEntityOfPage: string
  articleSection?: string
  keywords?: string
}

interface FAQPage extends SchemaBase {
  "@type": "FAQPage"
  mainEntity: Question[]
}

interface Question extends SchemaBase {
  "@type": "Question"
  name: string
  acceptedAnswer: Answer
}

interface Answer extends SchemaBase {
  "@type": "Answer"
  text: string
}

interface ItemList extends SchemaBase {
  "@type": "ItemList"
  name: string
  description: string
  url: string
  numberOfItems: number
  itemListElement: ListItem[]
}

interface ListItem extends SchemaBase {
  "@type": "ListItem"
  position: number
  name: string
  description: string
  url?: string
}

interface BreadcrumbList extends SchemaBase {
  "@type": "BreadcrumbList"
  itemListElement: BreadcrumbListItem[]
}

interface BreadcrumbListItem extends SchemaBase {
  "@type": "ListItem"
  position: number
  name: string
  item: string
}

interface WebSite extends SchemaBase {
  "@type": "WebSite"
  name: string
  description: string
  url: string
  author: PersonOrOrganization
  potentialAction?: SearchAction
}

interface SearchAction extends SchemaBase {
  "@type": "SearchAction"
  target: string
  "query-input": string
}

interface PersonOrOrganization {
  "@type": "Person" | "Organization"
  name: string
  url: string
  jobTitle?: string
  knowsAbout?: string[]
}

export function generateArticleSchema({
  title,
  description,
  author = "Jaith Darrah",
  datePublished,
  dateModified,
  url,
  image = "/open-graph-cat.png"
}: {
  title: string
  description: string
  author?: string
  datePublished: string
  dateModified?: string
  url: string
  image?: string
}): Article {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: {
      "@type": "Person",
      name: author,
      url: "https://jaithdarrah.com",
      jobTitle: "Full-Stack Software Engineer",
      knowsAbout: ["Microservices", "AI Integration", "Software Engineering", "TypeScript", "React"]
    },
    publisher: {
      "@type": "Person",
      name: author,
      url: "https://jaithdarrah.com"
    },
    datePublished,
    dateModified: dateModified || datePublished,
    url,
    image,
    mainEntityOfPage: url,
    articleSection: "Technology",
    keywords: "software engineering, AI integration, microservices, full-stack development"
  }
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): FAQPage {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  }
}

export function generateItemListSchema({
  name,
  description,
  items,
  url
}: {
  name: string
  description: string
  items: Array<{ name: string; description: string; url?: string }>
  url: string
}): ItemList {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
      ...(item.url && { url: item.url })
    }))
  }
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): BreadcrumbList {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: breadcrumb.name,
      item: breadcrumb.url
    }))
  }
}

export function generateWebsiteSchema(): WebSite {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Jaith Darrah - Full-Stack Software Engineer",
    description: "Full-stack software engineer specializing in microservices architecture, AI integration, and scalable web applications. Available for contract work and open-source collaboration.",
    url: "https://jaithdarrah.com",
    author: {
      "@type": "Person",
      name: "Jaith Darrah",
      jobTitle: "Full-Stack Software Engineer",
      url: "https://jaithdarrah.com"
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://jaithdarrah.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
}