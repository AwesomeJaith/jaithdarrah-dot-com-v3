export interface BlogPost {
  slug: string
  title: string
  description: string
  publishDate: string
  lastModified?: string
  readTime: string
  category: string
  tags: string[]
  featured?: boolean
}

export const blogPosts: BlogPost[] = [
  {
    slug: "deepeval-guide",
    title: "DeepEval: Complete Guide to LLM Testing and Evaluation Framework",
    description: "Learn how to use DeepEval for comprehensive LLM testing, evaluation metrics, and production monitoring. Includes setup, configuration, and real-world examples.",
    publishDate: "2026-04-08",
    lastModified: "2026-04-08",
    readTime: "8 min read",
    category: "AI/ML",
    tags: ["AI", "LLM", "Testing", "DeepEval", "Machine Learning"],
    featured: true
  },
  {
    slug: "ai-jobs-2026",
    title: "AI Jobs in 2026: Roles, Salaries, and How to Land Your First AI Engineering Position",
    description: "Complete guide to AI job market in 2026, including high-demand roles, salary ranges, and proven strategies to build a portfolio that gets offers.",
    publishDate: "2026-04-08",
    lastModified: "2026-04-08",
    readTime: "12 min read",
    category: "Career",
    tags: ["AI Jobs", "Career", "Salary", "Engineering", "Portfolio"],
    featured: true
  },
  {
    slug: "microservices-architecture",
    title: "Microservices Architecture Explained: Why Startups Choose It Over Monoliths",
    description: "Comprehensive guide to microservices architecture, benefits for startups, implementation patterns, and real-world examples from gaming tools development.",
    publishDate: "2026-04-08",
    lastModified: "2026-04-08",
    readTime: "10 min read",
    category: "Architecture",
    tags: ["Microservices", "Architecture", "Startups", "Scalability", "Backend"],
    featured: true
  },
  {
    slug: "ai-jobs-salary-guide",
    title: "AI Jobs Salary Guide 2026: What AI Engineers, Specialists, and Consultants Earn",
    description: "Detailed salary breakdown for AI professionals in 2026, including regional differences, experience levels, and negotiation strategies.",
    publishDate: "2026-04-08",
    lastModified: "2026-04-08",
    readTime: "7 min read",
    category: "Career",
    tags: ["AI Salary", "Compensation", "Career", "Engineering", "Freelance"],
    featured: false
  }
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug)
}

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter(post => post.featured)
}

export function getPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter(post => post.category === category)
}