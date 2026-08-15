import SwiftUI

struct StatusView: View {
    @ObservedObject var permissionManager: NotificationPermissions
    @ObservedObject var listener: UberNotificationListener
    @State private var isCheckingConnection = false

    var body: some View {
        VStack(spacing: 16) {
            // Permission Status
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: permissionManager.isAuthorized ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .foregroundColor(permissionManager.isAuthorized ? .green : .red)
                        Text("Notifications")
                            .fontWeight(.semibold)
                    }
                    Text(permissionManager.isAuthorized ? "Authorized" : "Not authorized")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(8)

            // Connection Status
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: listener.isConnected ? "wifi" : "wifi.slash")
                            .foregroundColor(listener.isConnected ? .green : .gray)
                        Text("Even Hub Connection")
                            .fontWeight(.semibold)
                    }
                    Text(listener.isConnected ? "Connected to web app" : "Waiting to connect")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if isCheckingConnection {
                    ProgressView()
                        .scaleEffect(0.8, anchor: .center)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(8)
            .onTapGesture {
                checkConnection()
            }

            // Instructions
            VStack(alignment: .leading, spacing: 8) {
                Text("How it works")
                    .fontWeight(.semibold)
                    .font(.caption)
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Text("1.")
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("Enable notifications in Settings")
                            .font(.caption)
                    }

                    HStack(spacing: 8) {
                        Text("2.")
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("Start Even Hub web app on your phone")
                            .font(.caption)
                    }

                    HStack(spacing: 8) {
                        Text("3.")
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("Order an Uber ride")
                            .font(.caption)
                    }

                    HStack(spacing: 8) {
                        Text("4.")
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("See driver info on G2 glasses")
                            .font(.caption)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(6)
            }
            .padding()
            .background(Color.blue.opacity(0.05))
            .cornerRadius(8)
        }
    }

    private func checkConnection() {
        isCheckingConnection = true
        listener.checkConnection { connected in
            isCheckingConnection = false
        }
    }
}

#Preview {
    StatusView(
        permissionManager: NotificationPermissions.shared,
        listener: UberNotificationListener.shared
    )
}
