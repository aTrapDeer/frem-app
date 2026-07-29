import { redirect } from 'next/navigation'

/** The ledger merged into the Money page. */
export default function LedgerRedirect() {
  redirect('/money')
}
