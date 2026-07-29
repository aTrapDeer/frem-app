import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Privacy Policy — FREM",
  description: "How FREM collects, uses, protects, and deletes your data.",
}

const EFFECTIVE_DATE = "July 29, 2026"

/**
 * The privacy policy. Written to match what the code actually does — read-only
 * bank access, encryption at rest, merchant names only to the AI provider —
 * rather than generic boilerplate that promises less and hides more.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-20">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-slate-950 tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Effective {EFFECTIVE_DATE}</p>

          <div className="mt-8 p-5 border border-slate-200 rounded-lg bg-slate-50">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>The short version:</strong> FREM reads your financial data
              to show you what happened with your money. Access to your bank is
              read-only and can never move funds. Your bank credentials never
              touch our servers. Access tokens are encrypted at rest. We do not
              sell your data. You can disconnect and delete at any time.
            </p>
          </div>

          <Section title="1. Who we are">
            <p>
              FREM (&ldquo;we,&rdquo; &ldquo;us&rdquo;) provides a personal and
              business finance application at frem.app that helps you compare
              what you planned to spend with what you actually spent. This
              policy describes what data we collect, why, and what happens to
              it. Questions can be sent to the contact address published on our
              site.
            </p>
          </Section>

          <Section title="2. What we collect">
            <ul>
              <li>
                <strong>Account information.</strong> When you sign in with
                Google, we receive your name, email address, and profile
                picture. We do not receive your Google password.
              </li>
              <li>
                <strong>Financial data, read-only.</strong> When you connect a
                bank through Plaid, we receive account names, balances, and
                transaction history (dates, amounts, merchant descriptions,
                categories). Your banking credentials are entered with Plaid,
                never with us, and are never transmitted to or stored on our
                servers. The access we hold cannot initiate transfers,
                payments, or any movement of money.
              </li>
              <li>
                <strong>Information you enter.</strong> Budgets, goals, income
                sources, business details (such as entity type and ownership
                percentage), spending estimates, investments, and debts you
                choose to add.
              </li>
              <li>
                <strong>Usage basics.</strong> Session data required to keep
                you signed in. We do not run third-party advertising trackers.
              </li>
            </ul>
          </Section>

          <Section title="3. How we use it">
            <ul>
              <li>To display your accounts, transactions, budgets, and goals.</li>
              <li>
                To categorize transactions. Most categorization happens with
                rules and data already on our servers. For merchants we cannot
                identify, we send <strong>merchant names only</strong> — never
                amounts, dates, balances, account details, or your identity —
                to our AI provider (OpenAI) for classification, and cache the
                answer so it is not sent again.
              </li>
              <li>
                To generate financial reports and chat responses. These use a
                summary of your financial picture processed by our AI provider
                under our instructions; the provider is not permitted to use
                this data to train its models under our API terms.
              </li>
              <li>To operate, secure, and improve the service.</li>
            </ul>
          </Section>

          <Section title="4. What we never do">
            <ul>
              <li>We never sell or rent your personal or financial data.</li>
              <li>We never initiate, authorize, or execute movement of your money.</li>
              <li>We never store your banking credentials.</li>
              <li>We never share your data with advertisers.</li>
            </ul>
          </Section>

          <Section title="5. How data is protected">
            <ul>
              <li>
                Bank access tokens are encrypted at rest with AES-256-GCM. The
                decryption key is stored separately from the database, so a
                database compromise alone cannot expose usable bank access.
              </li>
              <li>All traffic is encrypted in transit with TLS.</li>
              <li>
                Every data query is scoped to your account; no user can read
                another user&apos;s records.
              </li>
            </ul>
          </Section>

          <Section title="6. Third parties we rely on">
            <ul>
              <li>
                <strong>Plaid</strong> — bank connectivity. Governed by the{' '}
                <a
                  href="https://plaid.com/legal/#end-user-privacy-policy"
                  className="text-blue-600 hover:underline"
                  rel="noreferrer"
                  target="_blank"
                >
                  Plaid End User Privacy Policy
                </a>
                .
              </li>
              <li><strong>Google</strong> — sign-in.</li>
              <li><strong>OpenAI</strong> — transaction categorization and financial summaries, as limited in section 3.</li>
              <li><strong>Vercel and Turso</strong> — hosting and database infrastructure.</li>
            </ul>
          </Section>

          <Section title="7. Retention and deletion">
            <p>
              Your data stays while your account is active. Disconnecting a bank
              removes our access token and revokes it with Plaid. You may
              request full deletion of your account and all associated data at
              any time via the contact address on our site; we will complete it
              within 30 days.
            </p>
          </Section>

          <Section title="8. Changes">
            <p>
              If this policy changes materially, we will note the new effective
              date here and flag the change in the application before it takes
              effect.
            </p>
          </Section>

          <p className="mt-10 text-sm text-slate-500">
            See also our <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>.
          </p>
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
