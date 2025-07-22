import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold gradient-text">FREM</span>
            </div>
            <p className="text-sm text-slate-600">Forward your finances with intelligent tracking and optimization.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Product</h3>
            <div className="space-y-3">
              <Link href="/dashboard" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/goals" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Goals
              </Link>
              <Link href="/roadmap" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Roadmap
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Company</h3>
            <div className="space-y-3">
              <Link href="/about" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                About
              </Link>
              <Link href="/contact" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Contact
              </Link>
              <Link href="/privacy" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Privacy
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Support</h3>
            <div className="space-y-3">
              <Link href="/help" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Help Center
              </Link>
              <Link href="/docs" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Documentation
              </Link>
              <Link href="/status" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Status
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-slate-600">© 2024 FREM. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
