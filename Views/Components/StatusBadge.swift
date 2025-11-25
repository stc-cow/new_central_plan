import SwiftUI

struct StatusBadge: View {
    let status: FuelTask.Status

    private var statusTitle: String {
        switch status {
        case .pending:
            return "Pending"
        case .inProgress:
            return "In Progress"
        case .completed:
            return "Completed"
        case .cancelled:
            return "Cancelled"
        }
    }

    private var statusColor: Color {
        switch status {
        case .pending:
            return Color.orange
        case .inProgress:
            return Color.blue
        case .completed:
            return Color.green
        case .cancelled:
            return Color.red
        }
    }

    var body: some View {
        Text(statusTitle)
            .font(.footnote.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(statusColor.opacity(0.1))
            .foregroundColor(statusColor)
            .clipShape(Capsule())
    }
}

#Preview {
    VStack(spacing: 12) {
        StatusBadge(status: .pending)
        StatusBadge(status: .inProgress)
        StatusBadge(status: .completed)
        StatusBadge(status: .cancelled)
    }
    .padding()
}
