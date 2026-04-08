import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Clock } from "lucide-react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { blogPosts } from "@/lib/blog-posts"
import { generateBreadcrumbSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: "Blog - Software Engineering Insights",
  description: "Insights on microservices architecture, AI integration, software engineering best practices, and career guidance from full-stack developer Jaith Darrah.",
  alternates: {
    canonical: "https://jaithdarrah.com/blog",
  },
  openGraph: {
    title: "Blog - Software Engineering Insights | Jaith Darrah",
    description: "Insights on microservices architecture, AI integration, software engineering best practices, and career guidance from full-stack developer Jaith Darrah.",
    url: "https://jaithdarrah.com/blog",
  },
}

export default function BlogPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://jaithdarrah.com" },
    { name: "Blog", url: "https://jaithdarrah.com/blog" }
  ])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const featuredPosts = blogPosts.filter(post => post.featured)
  const otherPosts = blogPosts.filter(post => !post.featured)

  return (
    <div className="w-full max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mb-8">
        <Breadcrumbs items={[{ name: "Blog", href: "/blog", current: true }]} />
      </div>

      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Insights on microservices architecture, AI integration, software engineering best practices, 
          and career guidance. Written from experience building scalable applications and working with 
          cutting-edge technologies.
        </p>
      </div>

      {featuredPosts.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Articles</h2>
          <div className="grid gap-6">
            {featuredPosts.map((post) => (
              <article
                key={post.slug}
                className="border rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                <div className="mb-3">
                  <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {post.category}
                  </span>
                </div>
                
                <Link href={`/blog/${post.slug}`} className="group">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                </Link>
                
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {post.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDate(post.publishDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {otherPosts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">All Articles</h2>
          <div className="space-y-4">
            {otherPosts.map((post) => (
              <article
                key={post.slug}
                className="border-b pb-4 last:border-b-0"
              >
                <div className="mb-2">
                  <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                    {post.category}
                  </span>
                </div>
                
                <Link href={`/blog/${post.slug}`} className="group">
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                </Link>
                
                <p className="text-muted-foreground text-sm mb-3">
                  {post.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    <span>{formatDate(post.publishDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          Have questions about any of these topics or need help with your project?
        </p>
        <Link
          href="/#contact"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Get in Touch
        </Link>
      </div>
    </div>
  )
}