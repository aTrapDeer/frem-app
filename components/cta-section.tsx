"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function CTASection() {
  const { signInWithGoogle } = useAuth()

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-10 text-center shadow-lg border border-slate-200"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Ready to take control?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
            Join thousands who&apos;ve transformed their finances with smart tracking and intelligent insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={signInWithGoogle}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 btn-press"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="btn-press border-slate-300 hover:bg-slate-50">
              Learn More
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            No credit card required • Free forever for basic features
          </p>
        </motion.div>
      </div>
    </section>
  )
}
