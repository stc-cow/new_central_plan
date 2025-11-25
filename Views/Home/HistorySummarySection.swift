import SwiftUI

struct HistorySummarySection: View {
    let fuelLogs: [FuelLog]

    private var logsThisWeek: [FuelLog] {
        let calendar = Calendar.current
        return fuelLogs.filter { log in
            calendar.isDate(log.createdAt, equalTo: Date(), toGranularity: .weekOfYear)
        }
    }

    private var totalGallonsThisWeek: Double {
        logsThisWeek.reduce(0) { $0 + $1.gallonsDispensed }
    }

    private var lastLogDescription: String {
        guard let latest = fuelLogs.sorted(by: { $0.createdAt > $1.createdAt }).first else {
            return "No submissions yet"
        }
        return latest.createdAt.formatted(date: .abbreviated, time: .shortened)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("History")
                    .font(.title3.weight(.semibold))
                Spacer()
                NavigationLink("View All") {
                    HistoryView(fuelLogs: fuelLogs)
                }
                .font(.subheadline.weight(.semibold))
            }

            if fuelLogs.isEmpty {
                EmptyContentView(message: "Fuel logs will appear here after you submit them.")
            } else {
                VStack(spacing: 12) {
                    HistoryRow(title: "Logs This Week", value: "\(logsThisWeek.count)", systemImage: "calendar")
                    HistoryRow(title: "Gallons Dispensed", value: String(format: "%.0f gal", totalGallonsThisWeek), systemImage: "fuelpump.fill")
                    HistoryRow(title: "Last Submission", value: lastLogDescription, systemImage: "clock")
                }
            }
        }
    }
}

private struct HistoryRow: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        HStack {
            Image(systemName: systemImage)
                .frame(width: 32, height: 32)
                .foregroundColor(.accentColor)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.headline)
            }
            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    NavigationStack {
        HistorySummarySection(
            fuelLogs: [
                FuelLog(
                    id: UUID(),
                    taskId: UUID(),
                    driverId: UUID(),
                    gallonsDispensed: 120,
                    odometerReading: 45_000,
                    notes: "",
                    createdAt: Date()
                )
            ]
        )
        .padding()
    }
}
