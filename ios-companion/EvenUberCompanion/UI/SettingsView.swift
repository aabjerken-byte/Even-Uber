import SwiftUI
import UIKit

struct SettingsView: View {
    @ObservedObject var permissionManager: NotificationPermissions

    private var baseURL: String { EvenHubClient.shared.baseURLString }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }

    var body: some View {
        List {
            Section("Permissions") {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Notifications")
                            .fontWeight(.semibold)
                        Text(permissionManager.isAuthorized ? "Authorized" : "Not authorized")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Image(systemName: permissionManager.isAuthorized ? "checkmark.circle.fill" : "xmark.circle")
                        .foregroundColor(permissionManager.isAuthorized ? .green : .red)
                }

                if !permissionManager.isAuthorized {
                    Button {
                        permissionManager.requestPermission { _ in }
                    } label: {
                        Label("Request Permission", systemImage: "bell.badge.fill")
                    }

                    Button {
                        permissionManager.openNotificationSettings()
                    } label: {
                        Label("Open Settings App", systemImage: "gear")
                    }

                    Text("Go to Settings → Notifications → Even Uber Companion → Allow")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Section("Server Configuration") {
                settingRow("Even Hub URL", baseURL)
                settingRow("API Endpoint", "/api/ride-update")
                settingRow("Health Check", "/health")
            }

            Section("About") {
                settingRow("App", "Even Uber Companion", monospaced: false)
                settingRow("Version", appVersion, monospaced: false)
                settingRow("Platform", "iOS 16+", monospaced: false)
            }

            Section("Debug") {
                HStack {
                    Text("Notifications").font(.caption)
                    Spacer()
                    Text(permissionManager.isAuthorized ? "✅ ON" : "❌ OFF")
                        .font(.caption)
                        .foregroundColor(permissionManager.isAuthorized ? .green : .red)
                }

                HStack {
                    Text("Listener Status").font(.caption)
                    Spacer()
                    Text("Active")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func settingRow(_ label: String, _ value: String, monospaced: Bool = true) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Group {
                if monospaced {
                    Text(value).monospaced()
                } else {
                    Text(value)
                }
            }
            .font(.caption)
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView(permissionManager: NotificationPermissions.shared)
    }
}
