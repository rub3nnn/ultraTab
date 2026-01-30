/**
 * GoogleDriveService - Singleton service for syncing nightTab data to Google Drive
 *
 * Uses Chrome Identity API with seamless authentication flow:
 * - Attempts silent authentication first (using existing Chrome session)
 * - Falls back to interactive login only when necessary
 *
 * Stores data in Google Drive's hidden appDataFolder as nighttab_sync_data.json
 */

import { APP_NAME } from "../constant/index.js";

class GoogleDriveService {
  constructor() {
    if (GoogleDriveService.instance) {
      return GoogleDriveService.instance;
    }

    this.FILE_NAME = APP_NAME + "_sync_data.json";
    this.FOLDER = "appDataFolder";
    this.DISCONNECT_FLAG_KEY = "googleDrive_manuallyDisconnected";
    this.token = null;
    this.fileId = null;
    this.isInitialized = false;

    GoogleDriveService.instance = this;
  }

  /**
   * Initialize service with silent authentication attempt
   * Call this on extension startup to check if user is already authenticated
   * @returns {Promise<boolean>} - true if authenticated, false otherwise
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    // Check if user manually disconnected
    const wasDisconnected = await this.checkDisconnectFlag();
    if (wasDisconnected) {
      console.log(
        "[GoogleDriveService] User manually disconnected - skipping auto-reconnect",
      );
      return false;
    }

    try {
      // Try silent authentication (no popup)
      await this.getAuthToken(false);
      this.isInitialized = true;
      console.log("[GoogleDriveService] Silent authentication successful");
      return true;
    } catch (error) {
      console.log(
        "[GoogleDriveService] Silent authentication failed - user will need to login",
        error.message,
      );
      return false;
    }
  }

  /**
   * Get OAuth2 token using Chrome Identity API
   * @param {boolean} interactive - If true, shows login popup. If false, only uses cached token
   * @returns {Promise<string>} - Access token
   */
  async getAuthToken(interactive = true) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, async (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          reject(new Error("No token received"));
        } else {
          this.token = token;
          // Clear disconnect flag when successfully authenticated
          if (interactive) {
            await this.clearDisconnectFlag();
          }
          resolve(token);
        }
      });
    });
  }

  /**
   * Remove cached token and clear internal state
   * Call this when user wants to logout or switch accounts
   */
  async logout() {
    // Set flag to prevent auto-reconnect on reload
    await this.setDisconnectFlag();

    if (this.token) {
      return new Promise((resolve, reject) => {
        // First remove the cached token
        chrome.identity.removeCachedAuthToken({ token: this.token }, () => {
          if (chrome.runtime.lastError) {
            console.error(
              "[GoogleDriveService] Error removing cached token:",
              chrome.runtime.lastError,
            );
          }

          // Then revoke the token completely to force logout
          const revokeUrl = `https://accounts.google.com/o/oauth2/revoke?token=${this.token}`;
          fetch(revokeUrl)
            .then(() => {
              console.log("[GoogleDriveService] Token revoked successfully");
            })
            .catch((error) => {
              console.error(
                "[GoogleDriveService] Error revoking token:",
                error,
              );
            })
            .finally(() => {
              this.token = null;
              this.fileId = null;
              this.isInitialized = false;
              console.log("[GoogleDriveService] Logged out successfully");
              resolve();
            });
        });
      });
    } else {
      console.log(
        "[GoogleDriveService] No active token, but disconnect flag set",
      );
    }
  }

  /**
   * Make authenticated request to Google Drive API with automatic retry on 401
   * @param {string} url - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async authenticatedFetch(url, options = {}) {
    // Ensure we have a token
    if (!this.token) {
      await this.getAuthToken(true);
    }

    // Set authorization header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.token}`,
    };

    const response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401) {
      console.log("[GoogleDriveService] Token expired, refreshing...");

      // Remove cached token
      await new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: this.token }, resolve);
      });

      // Get new token
      this.token = null;
      await this.getAuthToken(true);

      // Retry request with new token
      const retryHeaders = {
        ...options.headers,
        Authorization: `Bearer ${this.token}`,
      };
      return fetch(url, { ...options, headers: retryHeaders });
    }

    return response;
  }

  /**
   * Find the sync file in Google Drive
   * @returns {Promise<string|null>} - File ID or null if not found
   */
  async findFile() {
    const query = `name = '${this.FILE_NAME}' and '${this.FOLDER}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=${this.FOLDER}&fields=files(id,name,modifiedTime,size)`;

    const response = await this.authenticatedFetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to search for file: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (data.files && data.files.length > 0) {
      this.fileId = data.files[0].id;
      return this.fileId;
    }

    return null;
  }

  /**
   * Get metadata of the sync file from Google Drive
   * @returns {Promise<{id: string, modifiedTime: string}|null>} - File metadata or null if not found
   */
  async getMetadata() {
    try {
      // Ensure we're authenticated
      if (!this.token) {
        await this.getAuthToken(true);
      }

      // Search for the file with metadata fields
      const query = `name = '${this.FILE_NAME}' and '${this.FOLDER}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=${this.FOLDER}&fields=files(id,name,modifiedTime)`;

      const response = await this.authenticatedFetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to get metadata: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        this.fileId = file.id;
        return {
          id: file.id,
          modifiedTime: file.modifiedTime,
        };
      }

      return null;
    } catch (error) {
      console.error("[GoogleDriveService] Get metadata failed:", error);
      throw error;
    }
  }

  /**
   * Create a new file in Google Drive using multipart upload
   * @param {object} jsonData - The data to save
   * @returns {Promise<string>} - File ID
   */
  async createFile(jsonData) {
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: this.FILE_NAME,
      mimeType: "application/json",
      parents: [this.FOLDER],
    };

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(jsonData, null, 2) +
      closeDelimiter;

    const response = await this.authenticatedFetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create file: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.fileId = data.id;
    console.log(`[GoogleDriveService] File created with ID: ${this.fileId}`);
    return this.fileId;
  }

  /**
   * Update an existing file in Google Drive
   * @param {string} fileId - The file ID to update
   * @param {object} jsonData - The data to save
   * @returns {Promise<void>}
   */
  async updateFile(fileId, jsonData) {
    const response = await this.authenticatedFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData, null, 2),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update file: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    console.log(`[GoogleDriveService] File updated: ${fileId}`);
  }

  /**
   * Save JSON data to Google Drive
   * Creates new file if it doesn't exist, updates if it does
   * @param {object} fullJsonState - Complete nightTab state to save
   * @returns {Promise<{success: boolean, fileId: string, action: string}>}
   */
  async save(fullJsonState) {
    try {
      // Ensure we're authenticated
      if (!this.token) {
        await this.getAuthToken(true);
      }

      // Check if file exists
      let fileId = this.fileId || (await this.findFile());

      if (fileId) {
        // Update existing file
        await this.updateFile(fileId, fullJsonState);
        return {
          success: true,
          fileId: fileId,
          action: "updated",
        };
      } else {
        // Create new file
        fileId = await this.createFile(fullJsonState);
        return {
          success: true,
          fileId: fileId,
          action: "created",
        };
      }
    } catch (error) {
      console.error("[GoogleDriveService] Save failed:", error);
      throw error;
    }
  }

  /**
   * Load JSON data from Google Drive
   * @returns {Promise<object|null>} - Parsed JSON data or null if file doesn't exist
   */
  async load() {
    try {
      // Ensure we're authenticated
      if (!this.token) {
        await this.getAuthToken(true);
      }

      // Find the file
      const fileId = this.fileId || (await this.findFile());

      if (!fileId) {
        console.log("[GoogleDriveService] No sync file found in Google Drive");
        return null;
      }

      // Download file content
      const response = await this.authenticatedFetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to download file: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("[GoogleDriveService] Data loaded successfully");
      return data;
    } catch (error) {
      console.error("[GoogleDriveService] Load failed:", error);
      throw error;
    }
  }

  /**
   * Alias for load() - Download JSON data from Google Drive
   * @returns {Promise<object|null>} - Parsed JSON data or null if file doesn't exist
   */
  async download() {
    return this.load();
  }

  /**
   * Initialize and auto-download if authenticated
   * @returns {Promise<{authenticated: boolean, data: object|null}>}
   */
  async initializeAndDownload() {
    const authenticated = await this.initialize();

    if (authenticated) {
      try {
        const data = await this.load();
        return { authenticated: true, data };
      } catch (error) {
        console.error("[GoogleDriveService] Failed to auto-download:", error);
        return { authenticated: true, data: null };
      }
    }

    return { authenticated: false, data: null };
  }

  /**
   * Delete the sync file from Google Drive
   * @returns {Promise<boolean>} - true if deleted successfully
   */
  async delete() {
    try {
      const fileId = this.fileId || (await this.findFile());

      if (!fileId) {
        console.log("[GoogleDriveService] No file to delete");
        return false;
      }

      const response = await this.authenticatedFetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete file: ${response.status} ${response.statusText}`,
        );
      }

      this.fileId = null;
      console.log("[GoogleDriveService] File deleted successfully");
      return true;
    } catch (error) {
      console.error("[GoogleDriveService] Delete failed:", error);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.token !== null;
  }

  /**
   * Set flag indicating user manually disconnected
   * @returns {Promise<void>}
   */
  async setDisconnectFlag() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.DISCONNECT_FLAG_KEY]: true }, () => {
        console.log(
          "[GoogleDriveService] Manual disconnect flag set - will not auto-reconnect",
        );
        resolve();
      });
    });
  }

  /**
   * Clear flag indicating user manually disconnected
   * @returns {Promise<void>}
   */
  async clearDisconnectFlag() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(this.DISCONNECT_FLAG_KEY, () => {
        console.log(
          "[GoogleDriveService] Manual disconnect flag cleared - auto-reconnect enabled",
        );
        resolve();
      });
    });
  }

  /**
   * Check if user manually disconnected
   * @returns {Promise<boolean>}
   */
  async checkDisconnectFlag() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.DISCONNECT_FLAG_KEY, (result) => {
        resolve(result[this.DISCONNECT_FLAG_KEY] === true);
      });
    });
  }
}

// Export singleton instance
const googleDriveService = new GoogleDriveService();
export default googleDriveService;
