import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var appViewModel: AppViewModel
    @State private var email: String = ""
    @State private var password: String = ""
    @FocusState private var focusedField: Field?

    private enum Field {
        case email
        case password
    }

    var body: some View {
        VStack {
            ScrollView {
                VStack(spacing: 32) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("ACES MSD Fuel Driver")
                            .font(.largeTitle.weight(.bold))
                        Text("Sign in with your driver credentials to access fueling assignments in real-time.")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.subheadline.weight(.semibold))
                            TextField("name@acesfuel.com", text: $email)
                                .focused($focusedField, equals: .email)
                                .keyboardType(.emailAddress)
                                .textContentType(.username)
                                .textInputAutocapitalization(.never)
                                .padding()
                                .background(Color(.secondarySystemBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.subheadline.weight(.semibold))
                            SecureField("Enter password", text: $password)
                                .focused($focusedField, equals: .password)
                                .textContentType(.password)
                                .padding()
                                .background(Color(.secondarySystemBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        if let message = appViewModel.authErrorMessage {
                            Text(message)
                                .font(.footnote)
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button(action: submitCredentials) {
                            if appViewModel.isAuthenticating {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .tint(.white)
                            } else {
                                Text("Sign In")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(appViewModel.isAuthenticating ? Color.accentColor.opacity(0.6) : Color.accentColor)
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .disabled(appViewModel.isAuthenticating)
                    }
                }
                .padding()
            }
        }
        .background(Color(.systemBackground))
        .navigationTitle("Sign In")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    focusedField = nil
                }
            }
        }
    }

    private func submitCredentials() {
        focusedField = nil
        Task {
            await appViewModel.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
        }
    }
}

#Preview {
    NavigationStack {
        LoginView()
            .environmentObject(AppViewModel())
    }
}
