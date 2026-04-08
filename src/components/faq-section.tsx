import { generateFAQSchema } from "@/lib/structured-data"

interface FAQ {
  question: string
  answer: string
}

interface FAQSectionProps {
  faqs: FAQ[]
  title?: string
}

export function FAQSection({ faqs, title = "Frequently Asked Questions" }: FAQSectionProps) {
  const faqSchema = generateFAQSchema(faqs)

  return (
    <section className="w-full max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="border-l-4 border-primary/20 pl-4">
            <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
            <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}