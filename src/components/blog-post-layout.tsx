import { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Clock } from "lucide-react"
import { Breadcrumbs } from "./breadcrumbs"
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/structured-data"

interface BlogPostLayoutProps {
  children: React.ReactNode
  title: string
  description: string
  publishDate: string
  lastModified?: string
  readTime: string
  category: string
  tags: string[]
  slug: string
}

export function BlogPostLayout({
  children,
  title,
  description,
  publishDate,
  lastModified,
  readTime,
  category,
  tags,
  slug
}: BlogPostLayoutProps) {
  const url = `https://jaithdarrah.com/blog/${slug}`
  const articleSchema = generateArticleSchema({
    title,
    description,
    datePublished: publishDate,
    dateModified: lastModified,
    url
  })

  const breadcrumbItems = [
    { name: "Blog", href: "/blog" },
    { name: title, href: `/blog/${slug}`, current: true }
  ]

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://jaithdarrah.com" },
    { name: "Blog", url: "https://jaithdarrah.com/blog" },
    { name: title, url: url }
  ])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mb-8">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <article className="prose prose-gray dark:prose-invert max-w-none">
        <header className="mb-8 not-prose">
          <div className="mb-4">
            <Link
              href={`/blog?category=${category.toLowerCase()}`}
              className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              {category}
            </Link>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            {title}
          </h1>
          
          <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span>Published {formatDate(publishDate)}</span>
            </div>
            
            {lastModified && lastModified !== publishDate && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>Updated {formatDate(lastModified)}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{readTime}</span>
            </div>
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {children}
      </article>

      <footer className="mt-12 pt-8 border-t">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Want to discuss this article or have questions about AI integration or microservices?
          </p>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </footer>
    </div>
  )
}

export function generateBlogPostMetadata({
  title,
  description,
  slug,
  publishDate,
  lastModified,
  tags
}: {
  title: string
  description: string
  slug: string
  publishDate: string
  lastModified?: string
  tags: string[]
}): Metadata {
  const url = `https://jaithdarrah.com/blog/${slug}`
  
  return {
    title,
    description,
    canonical: url,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: publishDate,
      modifiedTime: lastModified || publishDate,
      authors: ['Jaith Darrah'],
      tags,
      images: [
        {
          url: '/open-graph-cat.png',
          width: 1200,
          height: 630,
          alt: title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/open-graph-cat.png']
    },
    keywords: tags.join(', ')
  }
}