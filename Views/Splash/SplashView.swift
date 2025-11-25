import SwiftUI

struct SplashView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(.circular)
            Text("Syncing ACES MSD Fuel Driver data…")
                .font(.headline)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

#Preview {
    SplashView()
}
