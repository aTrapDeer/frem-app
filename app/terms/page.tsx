import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Terms of Service — FREM",
  description: "The terms that govern your use of FREM.",
}

const EFFECTIVE_DATE = "July 29, 2026"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-20">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-slate-950 tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Effective {EFFECTIVE_DATE}</p>

          <Section title="1. The service">
            <p>
              FREM is a financial tracking and planning application. It connects
              to your financial accounts with read-only access, organizes your
              transactions, compares your plans against measured activity, and
              models scenarios such as budgets, goals, and owner compensation.
              By creating an account you agree to these terms.
            </p>
          </Section>

          <Section title="2. Read-only, by design and by contract">
            <p>
              FREM&apos;s access to your financial accounts is limited to
              reading balances, transactions, and statements through our data
              provider. <strong>FREM cannot and will not initiate transfers,
              payments, withdrawals, deposits, trades, or any other movement of
              funds.</strong> We do not request, hold, or use any authority
              over your money. If any feature ever appears to offer money
              movement, it is a defect; do not use it and report it to us.
            </p>
          </Section>

          <Section title="3. Not financial, tax, legal, or investment advice">
            <p>
              FREM measures, calculates, and explains. Its projections, tax
              models, categorizations, and AI-generated reports are
              informational tools built on the data you provide and general
              published rules. They are estimates, they can be wrong, and they
              are <strong>not</strong> financial, tax, legal, accounting, or
              investment advice, and not a recommendation to buy or sell any
              security or financial product. Decisions with real consequences —
              tax elections, owner compensation, mortgages, investments,
              insurance — should be confirmed with a licensed professional who
              knows your situation.
            </p>
          </Section>

          <Section title="4. Your account and your data">
            <ul>
              <li>You must provide accurate information and keep your sign-in method secure.</li>
              <li>You may only connect financial accounts you are authorized to access.</li>
              <li>
                Your data remains yours. Our use of it is described in the{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </li>
              <li>You may disconnect accounts or request deletion at any time.</li>
            </ul>
          </Section>

          <Section title="5. Trials, subscriptions, and cancellation">
            <ul>
              <li>New accounts receive a 14-day free trial with no payment method required.</li>
              <li>
                Paid plans renew monthly or annually until cancelled.
                Cancellation takes effect at the end of the current billing
                period; no further charges are made after cancellation.
              </li>
              <li>Prices may change with at least 30 days&apos; notice before your next renewal.</li>
            </ul>
          </Section>

          <Section title="6. Acceptable use">
            <p>
              Do not attempt to access other users&apos; data, probe or disrupt
              the service, reverse engineer it beyond what law permits, or use
              it for unlawful purposes. We may suspend accounts that do.
            </p>
          </Section>

          <Section title="7. Accuracy and availability">
            <p>
              Financial data arrives from third-party institutions and may be
              delayed, incomplete, or occasionally wrong at the source.
              Categorization is automated and imperfect by nature; you can
              correct it, and corrections are remembered. The service is
              provided &ldquo;as is&rdquo; without warranty of uninterrupted
              availability or error-free operation.
            </p>
          </Section>

          <Section title="8. Limitation of liability">
            <p>
              To the maximum extent permitted by law, FREM&apos;s total
              liability for any claim arising from the service is limited to
              the amount you paid us in the twelve months before the claim. We
              are not liable for decisions you make based on the information
              the service displays, or for indirect, incidental, or
              consequential damages.
            </p>
          </Section>

          <Section title="9. Governing law">
            <p>
              These terms are governed by the laws of the State of Missouri,
              United States, without regard to conflict-of-law rules.
            </p>
          </Section>

          <Section title="10. Changes to these terms">
            <p>
              If these terms change materially, we will update the effective
              date above and notify you in the application before the changes
              apply to you.
            </p>
          </Section>
        </article>
      </main>

      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 text-[15px] text-slate-600 leading-relaxed space-y-3 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
