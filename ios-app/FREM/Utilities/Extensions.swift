import Foundation

extension Double {
    /// Format as currency string matching web app's formatCurrency
    var asCurrency: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: self)) ?? "$0"
    }

    /// Format as currency with cents
    var asCurrencyWithCents: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: self)) ?? "$0.00"
    }
}

extension String {
    /// Parse ISO date string to Date
    var toDate: Date? {
        let formatters: [DateFormatter] = {
            let isoFull = DateFormatter()
            isoFull.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"

            let isoSimple = DateFormatter()
            isoSimple.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"

            let dateOnly = DateFormatter()
            dateOnly.dateFormat = "yyyy-MM-dd"

            let datetime = DateFormatter()
            datetime.dateFormat = "yyyy-MM-dd HH:mm:ss"

            return [isoFull, isoSimple, dateOnly, datetime]
        }()

        for formatter in formatters {
            if let date = formatter.date(from: self) {
                return date
            }
        }
        return nil
    }

    /// Format date string to short display format matching web formatDate
    var asFormattedDate: String {
        guard let date = self.toDate else { return self }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    /// Format to short month + day
    var asShortDate: String {
        guard let date = self.toDate else { return self }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

extension Date {
    /// Today's date as yyyy-MM-dd string
    var asDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: self)
    }

    /// Current time as HH:mm:ss string
    var asTimeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        return formatter.string(from: self)
    }

    /// Short display format
    var asFormattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: self)
    }
}
