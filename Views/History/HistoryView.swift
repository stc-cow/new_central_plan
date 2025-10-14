import SwiftUI

struct HistoryView: View {
    let fuelLogs: [FuelLog]

    private var groupedLogs: [(date: Date, entries: [FuelLog])] {
        let grouped = Dictionary(grouping: fuelLogs) { log in
            Calendar.current.startOfDay(for: log.createdAt)
        }
        return grouped
            .map { (date: $0.key, entries: $0.value.sorted { $0.createdAt > $1.createdAt }) }
            .sorted { $0.date > $1.date }
    }

    var body: some View {
        VStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 24) {
                    ForEach(groupedLogs, id: \.date) { group in
                        VStack(alignment: .leading, spacing: 12) {
                            Text(group.date.formatted(date: .complete, time: .omitted))
                                .font(.headline)
                            VStack(spacing: 12) {
                                ForEach(group.entries, id: \.id) { log in
                                    FuelLogRow(log: log)
                                }
                            }
                        }
                    }

                    if fuelLogs.isEmpty {
                        EmptyContentView(message: "No fuel logs submitted yet.")
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Fuel Log History")
        .navigationBarTitleDisplayMode(.large)
        .background(Color(.systemBackground))
    }
}

private struct FuelLogRow: View {
    let log: FuelLog

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Task ID")
                .font(.caption)
                .foregroundColor(.secondary)
            Text(log.taskId.uuidString)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.primary)
                .textSelection(.enabled)

            Divider()

            HStack {
                Label(String(format: "%.0f gal", log.gallonsDispensed), systemImage: "fuelpump.fill")
                Spacer()
                Text(log.createdAt.formatted(date: .omitted, time: .shortened))
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }

            if let odometer = log.odometerReading {
                Label(String(format: "Odometer: %.0f mi", odometer), systemImage: "gauge")
            }

            if !log.notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(log.notes)
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    NavigationStack {
        HistoryView(
            fuelLogs: [
                FuelLog(
                    id: UUID(),
                    taskId: UUID(),
                    driverId: UUID(),
                    gallonsDispensed: 120,
                    odometerReading: 45_000,
                    notes: "Recorded picture upload in portal.",
                    createdAt: Date()
                ),
                FuelLog(
                    id: UUID(),
                    taskId: UUID(),
                    driverId: UUID(),
                    gallonsDispensed: 97,
                    odometerReading: nil,
                    notes: "",
                    createdAt: Date().addingTimeInterval(-10_800)
                )
            ]
        )
    }
}
