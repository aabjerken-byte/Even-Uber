import SwiftUI
import UIKit

struct StatusView: View {
    @ObservedObject var permissionManager: NotificationPermissions
    @ObservedObject var listener: UberNotificationListener
    @ObservedObject var locationProvider: LocationProvider = .shared
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
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(8)

            // Location Status — this is what anchors the map on the glasses
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: locationProvider.isAuthorized ? "location.fill" : "location.slash")
                            .foregroundColor(locationProvider.isAuthorized ? .green : .red)
                        Text("Location")
                            .fontWeight(.semibold)
                    }
                    Text(locationStatusText)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
            .padding()
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(8)

            // Connection Status — tap to re-check
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: listener.isConnected ? "wifi" : "wifi.slash")
                            .foregroundColor(listener.isConnected ? .green : .gray)
                        Text("Even Hub Connection")
                            .fontWeight(.semibold)
                    }
                    Text(listener.isConnected ? "Connected to web app" : "Tap to check connection")
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
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(8)
            .contentShape(Rectangle())
            .onTapGesture { checkConnection() }

            // Instructions
            VStack(alignment: .leading, spacing: 8) {
                Text("How it works")
                    .fontWeight(.semibold)
                    .font(.caption)
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 6) {
                    step(1, "Enable notifications in Settings")
                    step(2, "Start Even Hub web app on your phone")
                    step(3, "Order an Uber ride")
                    step(4, "See driver info on G2 glasses")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(uiColor: .systemGray6))
                .cornerRadius(6)
            }
            .padding()
            .background(Color.blue.opacity(0.05))
            .cornerRadius(8)
        }
        .task { checkConnection() }
    }

    private var locationStatusText: String {
        guard locationProvider.isAuthorized else {
            return "Not authorized — map will show ETA range only"
        }
        guard let coordinate = locationProvider.lastKnownLocation else {
            return "Authorized — acquiring position…"
        }
        return String(format: "%.4f, %.4f", coordinate.latitude, coordinate.longitude)
    }

    private func step(_ number: Int, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("\(number).")
                .fontWeight(.bold)
                .foregroundColor(.blue)
            Text(text)
                .font(.caption)
        }
    }

    private func checkConnection() {
        guard !isCheckingConnection else { return }
        isCheckingConnection = true
        listener.checkConnection { _ in
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
