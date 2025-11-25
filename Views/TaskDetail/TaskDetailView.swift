import SwiftUI

struct TaskDetailView: View {
    let task: FuelTask
    @EnvironmentObject private var appViewModel: AppViewModel
    @State private var submission = FuelLogSubmission()

    private var currentTask: FuelTask {
        appViewModel.tasks.first(where: { $0.id == task.id }) ?? task
    }

    private var actionInFlight: Bool {
        appViewModel.taskActionInFlight.contains(currentTask.id)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                overviewSection
                TaskMetadataSection(task: currentTask)
                timelineSection
                actionSection
            }
            .padding()
        }
        .navigationTitle("Task Details")
        .navigationBarTitleDisplayMode(.large)
        .background(Color(.systemBackground))
    }

    private var overviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(currentTask.siteName)
                .font(.title.weight(.semibold))
            Text(currentTask.instructions)
                .font(.body)
                .foregroundColor(.secondary)
            StatusBadge(status: currentTask.status)
        }
    }

    @ViewBuilder
    private var actionSection: some View {
        switch currentTask.status {
        case .pending:
            Button {
                Task {
                    await appViewModel.startTask(currentTask)
                }
            } label: {
                if actionInFlight {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.white)
                } else {
                    Text("Start Task")
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(actionInFlight ? Color.accentColor.opacity(0.6) : Color.accentColor)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .disabled(actionInFlight)

        case .inProgress:
            FuelLogFormView(
                submission: $submission,
                isSubmitting: appViewModel.isSubmittingLog && actionInFlight,
                errorMessage: appViewModel.logSubmissionError
            ) {
                Task {
                    await appViewModel.completeTask(currentTask, submission: submission)
                    if appViewModel.logSubmissionError == nil {
                        submission = FuelLogSubmission()
                    }
                }
            }

        case .completed:
            CompletedTaskSummary(task: currentTask)

        case .cancelled:
            CancelledTaskSummary()
        }
    }

    private var timelineSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Timeline")
                .font(.title3.weight(.semibold))
            VStack(alignment: .leading, spacing: 12) {
                TimelineRow(title: "Scheduled", timestamp: currentTask.scheduledAt, systemImage: "calendar")
                TimelineRow(title: "Started", timestamp: currentTask.startedAt, systemImage: "play.circle")
                TimelineRow(title: "Completed", timestamp: currentTask.completedAt, systemImage: "checkmark.circle")
                TimelineRow(title: "Last Updated", timestamp: currentTask.lastUpdatedAt, systemImage: "clock")
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}

private struct TimelineRow: View {
    let title: String
    let timestamp: Date?
    let systemImage: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage)
                .frame(width: 28)
                .foregroundColor(.accentColor)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(timestamp.map { $0.formatted(date: .abbreviated, time: .shortened) } ?? "—")
                    .font(.body.weight(.medium))
            }
            Spacer()
        }
    }
}

private struct CompletedTaskSummary: View {
    let task: FuelTask

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Task Completed")
                .font(.title3.weight(.semibold))
            if let completedAt = task.completedAt {
                Text("Completed on \(completedAt.formatted(date: .abbreviated, time: .shortened))")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct CancelledTaskSummary: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Task Cancelled")
                .font(.title3.weight(.semibold))
            Text("This assignment was cancelled by dispatch. No action is required.")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct TaskMetadataSection: View {
    let task: FuelTask

    var body: some View {
        VStack(spacing: 12) {
            InfoRow(title: "Vehicle", value: task.vehicleIdentifier, systemImage: "car.fill")
            InfoRow(title: "Fuel Type", value: task.fuelType, systemImage: "fuelpump.fill")
            InfoRow(title: "Scheduled", value: task.scheduledAt.formatted(date: .complete, time: .shortened), systemImage: "calendar")
            InfoRow(title: "Capacity", value: "\(Int(task.capacityGallons)) gal", systemImage: "gauge")
            InfoRow(title: "Priority", value: "#\(task.priority)", systemImage: "flag.fill")
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct InfoRow: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        HStack {
            Image(systemName: systemImage)
                .frame(width: 28)
                .foregroundColor(.accentColor)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.body.weight(.medium))
            }
            Spacer()
        }
    }
}

#Preview {
    NavigationStack {
        TaskDetailView(task: FuelTask(
            id: UUID(),
            siteName: "Terminal 5",
            vehicleIdentifier: "Fleet 102",
            scheduledAt: .now,
            status: .inProgress,
            instructions: "Confirm hazardous materials protocols and capture before/after photos.",
            fuelType: "Diesel",
            capacityGallons: 120,
            priority: 1,
            assignedDriverId: UUID(),
            startedAt: Date().addingTimeInterval(-1_800),
            completedAt: nil,
            lastUpdatedAt: .now
        ))
        .environmentObject(AppViewModel())
    }
}
