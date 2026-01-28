import { message } from "../../message";

import { data } from "../../data";
import { menu } from "../../menu";
import { version } from "../../version";

import * as form from "../../form";

import { Button } from "../../button";
import { Alert } from "../../alert";
import { DropFile } from "../../dropFile";
import { Link } from "../../link";

import { Control_helperText } from "../../control/helperText";
import { Control_inputButton } from "../../control/inputButton";

import { node } from "../../../utility/node";

// Import GoogleDriveService
import googleDriveService from "../../../service/GoogleDriveService.js";

const dataSetting = {};

dataSetting.control = {
  sync: {},
  restore: {},
  backup: {},
  clear: {},
};

dataSetting.sync = (parent) => {
  // State to track authentication and last upload
  let isAuthenticated = false;
  let lastUploadTime = null;
  let isProcessing = false;
  let currentOperation = null; // 'loading', 'uploading', 'downloading', 'connecting', null

  // Create container for dynamic content
  const container = node("div");

  // Helper text
  dataSetting.control.sync.helper = new Control_helperText({
    text: [
      message.get("menuContentDataSyncHelperPara1"),
      message.get("menuContentDataSyncHelperPara2"),
    ],
  });

  // Status container (will be updated dynamically)
  let statusContainer = null;

  // Feedback element
  dataSetting.control.sync.feedback = form.feedback();

  // Function to show feedback message
  const showFeedback = (messageText, isError = false) => {
    dataSetting.control.sync.feedback.innerHTML = "";
    const feedbackNode = node("p|class:small muted", messageText);
    if (isError) {
      feedbackNode.style.color = "var(--theme-accent)";
    }
    dataSetting.control.sync.feedback.appendChild(feedbackNode);
  };

  // Function to clear feedback
  const clearFeedback = () => {
    dataSetting.control.sync.feedback.innerHTML = "";
  };

  // Function to update sync status from Drive
  const updateSyncStatus = async () => {
    try {
      const metadata = await googleDriveService.getMetadata();

      if (metadata && metadata.modifiedTime) {
        lastUploadTime = new Date(metadata.modifiedTime).getTime();
      } else {
        lastUploadTime = null;
      }

      return lastUploadTime !== null;
    } catch (error) {
      console.error("Failed to get sync status:", error);
      lastUploadTime = null;
      return false;
    }
  };

  // Function to update status display
  const updateStatusDisplay = () => {
    if (!statusContainer) return;

    statusContainer.innerHTML = "";

    const statusContent = node("p|class:small muted");

    if (currentOperation === "loading") {
      statusContent.innerHTML =
        message.get("menuContentDataSyncLastUpload") + ": <em>Checking...</em>";
    } else if (currentOperation === "uploading") {
      statusContent.innerHTML = "<em>Uploading backup to Drive...</em>";
    } else if (currentOperation === "downloading") {
      statusContent.innerHTML = "<em>Downloading backup from Drive...</em>";
    } else if (currentOperation === "connecting") {
      statusContent.innerHTML = "<em>Connecting to Google Drive...</em>";
    } else {
      // Show last upload time
      if (lastUploadTime) {
        const dateStr = new Date(lastUploadTime).toLocaleString();
        statusContent.innerHTML =
          message.get("menuContentDataSyncLastUpload") +
          ": <strong>" +
          dateStr +
          "</strong>";
      } else {
        statusContent.innerHTML =
          message.get("menuContentDataSyncLastUpload") +
          ": <em>" +
          message.get("menuContentDataSyncNever") +
          "</em>";
      }
    }

    statusContainer.appendChild(statusContent);
  };

  // Function to render UI based on authentication state
  const renderUI = () => {
    // Clear container
    container.innerHTML = "";

    if (!isAuthenticated) {
      // Show only connect button when not authenticated
      dataSetting.control.sync.connectButton = new Button({
        text: message.get("menuContentDataSyncConnect"),
        style: ["line"],
        func: async () => {
          if (isProcessing) return;
          isProcessing = true;
          currentOperation = "connecting";
          clearFeedback();

          try {
            await googleDriveService.getAuthToken(true);
            isAuthenticated = true;

            // Get sync status after connecting
            currentOperation = "loading";
            renderUI(); // Re-render to show loading state

            const hasBackup = await updateSyncStatus();
            currentOperation = null;

            if (hasBackup) {
              showFeedback(
                message.get("menuContentDataSyncConnected") +
                  " - Backup found in Drive",
              );
            } else {
              showFeedback(
                message.get("menuContentDataSyncConnected") +
                  " - No backup found yet",
              );
            }

            renderUI();
          } catch (error) {
            console.error("Failed to connect:", error);
            showFeedback(message.get("menuContentDataSyncErrorConnect"), true);
            currentOperation = null;
          } finally {
            isProcessing = false;
          }
        },
      });

      container.appendChild(
        form.wrap({
          children: [dataSetting.control.sync.connectButton.wrap()],
        }),
      );
    } else {
      // Show full controls when authenticated

      // Status indicator container
      statusContainer = node("div|class:form-group");
      updateStatusDisplay();

      // Upload button
      dataSetting.control.sync.uploadButton = new Button({
        text: message.get("menuContentDataSyncUpload"),
        style: ["line"],
        func: async () => {
          if (isProcessing) return;
          isProcessing = true;
          currentOperation = "uploading";
          clearFeedback();
          updateStatusDisplay();

          try {
            const currentData = data.load();
            const result = await googleDriveService.save(currentData);

            // Update sync status from Drive to get actual modifiedTime
            currentOperation = "loading";
            updateStatusDisplay();

            await updateSyncStatus();
            currentOperation = null;

            showFeedback(message.get("menuContentDataSyncSuccessUpload"));
            updateStatusDisplay();
          } catch (error) {
            console.error("Failed to upload:", error);
            currentOperation = null;
            showFeedback(
              message.get("menuContentDataSyncErrorUpload") +
                ": " +
                error.message,
              true,
            );
            updateStatusDisplay();
          } finally {
            isProcessing = false;
          }
        },
      });

      // Download button
      dataSetting.control.sync.downloadButton = new Button({
        text: message.get("menuContentDataSyncDownload"),
        style: ["line"],
        func: async () => {
          if (isProcessing) return;
          isProcessing = true;
          currentOperation = "downloading";
          clearFeedback();
          updateStatusDisplay();

          try {
            const cloudData = await googleDriveService.load();

            if (!cloudData) {
              currentOperation = null;
              showFeedback(message.get("menuContentDataSyncErrorNoData"), true);
              updateStatusDisplay();
              return;
            }

            // Backup current data before restoring
            const currentData = data.load();
            if (currentData) {
              data.backup(currentData);
            }

            // Update data if versions differ
            let dataToRestore = cloudData;
            if (dataToRestore.version !== version.number) {
              dataToRestore = data.update(dataToRestore);
            }

            // Apply the cloud data
            data.restore(dataToRestore);
            data.save();

            currentOperation = null;
            showFeedback(message.get("menuContentDataSyncSuccessDownload"));
            updateStatusDisplay();

            // Reload the page to apply changes
            setTimeout(() => {
              data.reload.render();
            }, 1500);
          } catch (error) {
            console.error("Failed to download:", error);
            currentOperation = null;
            showFeedback(
              message.get("menuContentDataSyncErrorDownload") +
                ": " +
                error.message,
              true,
            );
            updateStatusDisplay();
          } finally {
            isProcessing = false;
          }
        },
      });

      // Delete button
      dataSetting.control.sync.deleteButton = new Button({
        text: message.get("menuContentDataSyncDelete"),
        style: ["line"],
        func: async () => {
          if (isProcessing) return;

          const confirmed = confirm(
            "¿Estás seguro de que quieres eliminar la copia de seguridad de Google Drive?",
          );
          if (!confirmed) return;

          isProcessing = true;
          clearFeedback();

          try {
            await googleDriveService.delete();
            lastUploadTime = null;
            currentOperation = null;
            showFeedback(message.get("menuContentDataSyncSuccessDelete"));
            updateStatusDisplay();
          } catch (error) {
            console.error("Failed to delete:", error);
            showFeedback("Error al eliminar: " + error.message, true);
          } finally {
            isProcessing = false;
          }
        },
      });

      // Disconnect button
      dataSetting.control.sync.disconnectButton = new Button({
        text: message.get("menuContentDataSyncDisconnect"),
        style: ["line"],
        func: async () => {
          if (isProcessing) return;
          isProcessing = true;
          clearFeedback();

          try {
            await googleDriveService.logout();
            isAuthenticated = false;
            lastUploadTime = null;
            currentOperation = null;
            renderUI();
          } catch (error) {
            console.error("Failed to disconnect:", error);
          } finally {
            isProcessing = false;
          }
        },
      });

      container.appendChild(
        node("div", [
          statusContainer,
          form.wrap({
            children: [
              form.inline({
                gap: "small",
                equalGap: true,
                wrap: true,
                children: [
                  dataSetting.control.sync.uploadButton.wrap(),
                  dataSetting.control.sync.downloadButton.wrap(),
                ],
              }),
            ],
          }),
          form.wrap({
            children: [
              form.inline({
                gap: "small",
                equalGap: true,
                wrap: true,
                children: [
                  dataSetting.control.sync.deleteButton.wrap(),
                  dataSetting.control.sync.disconnectButton.wrap(),
                ],
              }),
            ],
          }),
        ]),
      );
    }
  };

  // Initialize - check if already authenticated
  googleDriveService.initialize().then(async (authenticated) => {
    isAuthenticated = authenticated;

    // If authenticated, get the last sync status from Drive
    if (isAuthenticated) {
      currentOperation = "loading";
      renderUI(); // Render with loading state

      await updateSyncStatus();
      currentOperation = null;
    }

    renderUI();
  });

  parent.appendChild(
    node("div", [
      container,
      //form.wrap({children: [dataSetting.control.sync.feedback],}),
      dataSetting.control.sync.helper.wrap(),
    ]),
  );
};

dataSetting.restore = (parent) => {
  dataSetting.control.restore.restoreElement = new Control_inputButton({
    id: "restore-data",
    type: "file",
    buttonHideInput: true,
    labelText: message.get("menuContentDataRestoreFile"),
    inputButtonStyle: ["line"],
    action: () => {
      data.import.file({
        fileList: dataSetting.control.restore.restoreElement.input.files,
        feedback: dataSetting.control.restore.feedback,
        input: dataSetting.control.restore.restoreElement,
      });
    },
  });

  dataSetting.control.restore.paste = new Button({
    text: message.get("menuContentDataRestoreClipboard"),
    style: ["line"],
    func: () => {
      data.import.paste({
        feedback: dataSetting.control.restore.feedback,
      });
    },
  });

  dataSetting.control.restore.restoreHelper = new Control_helperText({
    text: [message.get("menuContentDataRestoreHelperPara1")],
  });

  dataSetting.control.restore.feedback = form.feedback();

  data.feedback.clear.render(dataSetting.control.restore.feedback);

  data.feedback.empty.render(dataSetting.control.restore.feedback);

  dataSetting.control.restore.drop = new DropFile({
    heading: message.get("menuContentDataRestoreDrop"),
    dropAaction: () => {
      data.import.drop({
        fileList: dataSetting.control.restore.drop.files,
        feedback: dataSetting.control.restore.feedback,
      });
    },
    children: [
      dataSetting.control.restore.restoreElement.button,
      dataSetting.control.restore.paste.button,
    ],
  });

  parent.appendChild(
    node("div", [
      dataSetting.control.restore.drop.wrap(),
      form.wrap({
        children: [dataSetting.control.restore.feedback],
      }),
      dataSetting.control.restore.restoreHelper.wrap(),
    ]),
  );
};

dataSetting.backup = (parent) => {
  dataSetting.control.backup.export = new Button({
    text: message.get("menuContentDataBackupFile"),
    style: ["line"],
    func: () => {
      data.export();
    },
  });

  dataSetting.control.backup.copy = new Button({
    text: message.get("menuContentDataBackupClipboard"),
    style: ["line"],
    func: () => {
      navigator.clipboard.writeText(JSON.stringify(data.load()));
    },
  });

  dataSetting.control.backup.exportHelper = new Control_helperText({
    text: [
      message.get("menuContentDataBackupHelperPara1"),
      message.get("menuContentDataBackupHelperPara2"),
    ],
  });

  parent.appendChild(
    node("div", [
      form.wrap({
        children: [
          form.inline({
            gap: "small",
            equalGap: true,
            wrap: true,
            children: [
              dataSetting.control.backup.export.wrap(),
              dataSetting.control.backup.copy.wrap(),
            ],
          }),
        ],
      }),
      dataSetting.control.backup.exportHelper.wrap(),
    ]),
  );
};

dataSetting.clear = (parent) => {
  dataSetting.control.clear.all = new Button({
    text: message.get("menuContentDataClearAll"),
    style: ["line"],
    func: () => {
      menu.close();
      data.clear.all.render();
    },
  });

  dataSetting.control.clear.partial = new Button({
    text: message.get("menuContentDataClearPartial"),
    style: ["line"],
    func: () => {
      menu.close();
      data.clear.partial.render();
    },
  });

  dataSetting.control.clear.link = new Link({
    text: message.get("menuContentDataClearAlertLink"),
    href: "#menu-content-item-backup",
  });

  dataSetting.control.clear.alert = new Alert({
    iconName: "warning",
    children: [
      node(
        `p:${message.get("menuContentDataClearAlertPara") || "Text"}|class:small`,
      ),
      node("p|class:small", dataSetting.control.clear.link.link()),
    ],
  });

  dataSetting.control.clear.helper = new Control_helperText({
    text: [
      message.get("menuContentDataClearHelperPara1"),
      message.get("menuContentDataClearHelperPara2"),
    ],
  });

  parent.appendChild(
    node("div", [
      form.wrap({
        children: [
          form.inline({
            gap: "small",
            equalGap: true,
            wrap: true,
            children: [
              dataSetting.control.clear.all.wrap(),
              dataSetting.control.clear.partial.wrap(),
            ],
          }),
        ],
      }),
      dataSetting.control.clear.alert.wrap(),
      dataSetting.control.clear.helper.wrap(),
    ]),
  );
};

export { dataSetting };
