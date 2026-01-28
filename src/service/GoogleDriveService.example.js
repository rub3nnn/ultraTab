import googleDriveService from "./service/GoogleDriveService.js";

// ============================================
// 1. INITIALIZE ON EXTENSION STARTUP
// ============================================

async function initializeGoogleDriveSync() {
  console.log("Checking Google Drive authentication status...");

  const isAuthenticated = await googleDriveService.initialize();

  if (isAuthenticated) {
    console.log("✓ User is already authenticated with Google Drive");
    // Optionally, load synced data immediately
    // const data = await googleDriveService.load();
  } else {
    console.log("⚠ User needs to login to enable Google Drive sync");
    // Show a "Connect to Google Drive" button in your UI
  }
}

// Call this when extension loads
// initializeGoogleDriveSync();

// ============================================
// 2. MANUAL LOGIN (Interactive)
// ============================================
// Trigger this from a user button click

async function handleConnectToGoogleDrive() {
  try {
    // This will show the Google login popup if needed
    await googleDriveService.getAuthToken(true);

    console.log("✓ Successfully connected to Google Drive");
    // Update UI to show connected status
  } catch (error) {
    console.error("Failed to connect to Google Drive:", error);
    alert("Could not connect to Google Drive. Please try again.");
  }
}

// ============================================
// 3. SAVE DATA TO GOOGLE DRIVE
// ============================================

async function saveToGoogleDrive(nightTabState) {
  try {
    const result = await googleDriveService.save(nightTabState);

    console.log(`✓ Data ${result.action} successfully`);
    console.log(`File ID: ${result.fileId}`);

    // Show success message to user
    return result;
  } catch (error) {
    console.error("Failed to save to Google Drive:", error);

    if (error.message.includes("No token")) {
      // User is not authenticated, show login button
      alert("Please connect to Google Drive first");
    } else {
      alert("Failed to save to Google Drive: " + error.message);
    }

    throw error;
  }
}

// Example: Save current state
// const currentState = { /* your nightTab state object */ };
// await saveToGoogleDrive(currentState);

// ============================================
// 4. LOAD DATA FROM GOOGLE DRIVE
// ============================================

async function loadFromGoogleDrive() {
  try {
    const data = await googleDriveService.load();

    if (data) {
      console.log("✓ Data loaded from Google Drive");
      // Apply the loaded state to your application
      return data;
    } else {
      console.log("ℹ No sync file found in Google Drive");
      return null;
    }
  } catch (error) {
    console.error("Failed to load from Google Drive:", error);
    alert("Failed to load from Google Drive: " + error.message);
    throw error;
  }
}

// Example usage:
// const syncedData = await loadFromGoogleDrive();
// if (syncedData) {
//   // Apply to your app
// }

// ============================================
// 5. AUTO-SYNC PATTERN
// ============================================
// Automatically save when state changes

let saveTimeout;

function autoSaveToGoogleDrive(nightTabState) {
  // Debounce: wait 2 seconds after last change before saving
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    if (googleDriveService.isAuthenticated()) {
      try {
        await googleDriveService.save(nightTabState);
        console.log("✓ Auto-saved to Google Drive");
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }
  }, 2000);
}

// ============================================
// 6. LOGOUT / DISCONNECT
// ============================================

async function disconnectFromGoogleDrive() {
  try {
    await googleDriveService.logout();
    console.log("✓ Disconnected from Google Drive");
    // Update UI to show disconnected status
  } catch (error) {
    console.error("Failed to logout:", error);
  }
}

// ============================================
// 7. DELETE SYNC FILE
// ============================================

async function deleteGoogleDriveSyncFile() {
  const confirmed = confirm(
    "Are you sure you want to delete your sync file from Google Drive?",
  );

  if (confirmed) {
    try {
      const deleted = await googleDriveService.delete();
      if (deleted) {
        console.log("✓ Sync file deleted from Google Drive");
      }
    } catch (error) {
      console.error("Failed to delete sync file:", error);
    }
  }
}

// ============================================
// 8. COMPLETE SYNC FLOW EXAMPLE
// ============================================

class NightTabSyncManager {
  constructor() {
    this.lastSyncTime = null;
  }

  async initialize() {
    // Try silent authentication
    const isAuthenticated = await googleDriveService.initialize();

    if (isAuthenticated) {
      // Load synced data if available
      await this.loadAndMerge();
    }
  }

  async enableSync() {
    try {
      // Show login popup if needed
      await googleDriveService.getAuthToken(true);

      // Upload current state
      const currentState = this.getCurrentNightTabState();
      await googleDriveService.save(currentState);

      this.lastSyncTime = new Date();
      return true;
    } catch (error) {
      console.error("Failed to enable sync:", error);
      return false;
    }
  }

  async loadAndMerge() {
    try {
      const cloudData = await googleDriveService.load();

      if (cloudData) {
        // Compare timestamps or versions
        const localData = this.getCurrentNightTabState();

        // Your merge logic here
        // For example, use the most recent data
        if (this.shouldUseCloudData(localData, cloudData)) {
          this.applyNightTabState(cloudData);
          console.log("✓ Applied cloud data");
        }
      }
    } catch (error) {
      console.error("Failed to load and merge:", error);
    }
  }

  async sync() {
    if (!googleDriveService.isAuthenticated()) {
      console.log("Not authenticated, skipping sync");
      return;
    }

    try {
      const currentState = this.getCurrentNightTabState();
      await googleDriveService.save(currentState);
      this.lastSyncTime = new Date();
      console.log("✓ Synced to Google Drive");
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    }
  }

  // Placeholder methods - implement based on your app structure
  getCurrentNightTabState() {
    // Return your current nightTab state object
    return {};
  }

  applyNightTabState(state) {
    // Apply the state to your application
  }

  shouldUseCloudData(localData, cloudData) {
    // Implement your merge logic
    // For example, compare timestamps
    return true;
  }
}

// Export for use in your app
export {
  initializeGoogleDriveSync,
  handleConnectToGoogleDrive,
  saveToGoogleDrive,
  loadFromGoogleDrive,
  autoSaveToGoogleDrive,
  disconnectFromGoogleDrive,
  deleteGoogleDriveSyncFile,
  NightTabSyncManager,
};
