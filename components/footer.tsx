import Link from "next/link"

/**
 * Footer. Every link goes somewhere real — a link garden of /about, /docs and
 * /status pages that never existed is what makes a site feel like a template.
 */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-10">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold text-slate-900">FREM</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              What you actually spent, beside what you planned to.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              FREM connects to your accounts with read-only access. It can see
              balances, transactions, and statements. It can never move,
              transfer, or touch your money.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Product</h3>
            <div className="space-y-3">
              <Link href="/money" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Money
              </Link>
              <Link href="/goals" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Goals
              </Link>
              <Link href="/accounts" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Accounts
              </Link>
              <Link href="/pricing" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Legal</h3>
            <div className="space-y-3">
              <Link href="/privacy" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Privacy policy
              </Link>
              <Link href="/terms" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Terms of service
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-3">
          <p className="text-sm text-slate-500">© {year} FREM. All rights reserved.</p>
          <p className="text-sm text-slate-400">
            Not financial, tax, or investment advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
