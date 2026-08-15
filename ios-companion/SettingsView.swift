import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var permissionManager: NotificationPermissions

    var body: some View {
        NavigationStack {
            List {
                // Permissions Section
                Section("Permissions") {
                    VStack(alignment: .leading, spacing: 12) {
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
                            VStack(alignment: .leading, spacing: 8) {
                                Button(action: {
                                    permissionManager.requestPermission { _ in }
                                }) {
                                    HStack {
                                        Image(systemName: "bell.badge.fill")
                                        Text("Request Permission")
                                        Spacer()
                                    }
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                                }

                                Button(action: {
                                    permissionManager.openNotificationSettings()
                                }) {
                                    HStack {
                                        Image(systemName: "gear")
                                        Text("Open Settings App")
                                        Spacer()
                                    }
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                                }

                                Text("Go to Settings → Notifications → Even Uber Companion → Allow")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.top, 8)
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }

                // Server Configuration
                Section("Server Configuration") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Even Hub URL")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("127.0.0.1:3000")
                                .font(.caption)
                                .monospaced()
                        }

                        HStack {
                            Text("API Endpoint")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("/api/ride-update")
                                .font(.caption)
                                .monospaced()
                        }

                        HStack {
                            Text("Health Check")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("/health")
                                .font(.caption)
                                .monospaced()
                        }
                    }
                    .padding(.vertical, 4)
                }

                // About Section
                Section("About") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("App")
                            Spacer()
                            Text("Even Uber Companion")
                                .foregroundColor(.secondary)
                        }
                        .font(.caption)

                        HStack {
                            Text("Version")
                            Spacer()
                            Text("1.0.0")
                                .foregroundColor(.secondary)
                        }
                        .font(.caption)

                        HStack {
                            Text("Platform")
                            Spacer()
                            Text("iOS 16+")
                                .foregroundColor(.secondary)
                        }
                        .font(.caption)
                    }
                    .padding(.vertical, 4)
                }

                // Debug Info
                Section("Debug") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Notifications")
                                .font(.caption)
                            Spacer()
                            Text(permissionManager.isAuthorized ? "✅ ON" : "❌ OFF")
                                .font(.caption)
                                .foregroundColor(permissionManager.isAuthorized ? .green : .red)
                        }

                        HStack {
                            Text("Listener Status")
                                .font(.caption)
                            Spacer()
                            Text("Active")
                                .font(.caption)
                                .foregroundColor(.green)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    SettingsView(permissionManager: NotificationPermissions.shared)
}
