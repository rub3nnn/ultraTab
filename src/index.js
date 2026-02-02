import { component, WelcomeModal, Splash } from "./component";

import { APP_NAME } from "./constant";

// Import Google Drive Service for silent authentication
import googleDriveService from "./service/GoogleDriveService.js";

import { node } from "./utility/node";
import { complexNode } from "./utility/complexNode";

console.log(
  APP_NAME + " version:",
  component.version.number,
  component.version.name,
);

// Flag to check if this is the first run
const FIRST_RUN_KEY = APP_NAME + "_first_run_completed";

// Check if this is the first run
const checkFirstRun = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(FIRST_RUN_KEY, (result) => {
      const isFirstRun = !result[FIRST_RUN_KEY];
      resolve(isFirstRun);
    });
  });
};

// Mark first run as completed
const markFirstRunCompleted = () => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FIRST_RUN_KEY]: true }, () => {
      console.log("[Startup] First run completed flag set");
      resolve();
    });
  });
};

// Create and show fullscreen splash screen
export const showSplash = (text = "Inicializando...") => {
  const splash = new Splash();
  const splashContainer = node("div|class:splash-fullscreen", [
    splash.splash(),
    complexNode({
      tag: "p",
      text: text,
      attr: [{ key: "class", value: "splash-loading-text" }],
    }),
  ]);

  document.body.appendChild(splashContainer);

  return splashContainer;
};

// Remove splash screen
export const hideSplash = (splashContainer) => {
  return new Promise((resolve) => {
    splashContainer.style.opacity = "0";
    splashContainer.style.transition = "opacity 0.5s ease-out";

    setTimeout(() => {
      if (document.body.contains(splashContainer)) {
        document.body.removeChild(splashContainer);
      }
      resolve();
    }, 500);
  });
};

// Initialize the application
const initializeApp = async () => {
  try {
    // Initialize basic components
    component.data.init();
    component.theme.init();
    component.layout.init();
    component.toolbar.init();
    component.header.init();
    component.group.init();
    component.bookmark.init();
    component.groupAndBookmark.init();
    component.pageLock.init();
    component.keyboard.init();

    // Check if this is the first run
    const isFirstRun = await checkFirstRun();

    if (isFirstRun) {
      console.log("[Startup] First run detected");

      // Show splash screen only on first run
      const splashContainer = showSplash();

      // Try to authenticate and download from Google Drive
      const { authenticated, data } =
        await googleDriveService.initializeAndDownload();

      if (authenticated && data) {
        // User is authenticated and has data in Drive - apply it immediately
        console.log("[Startup] Drive data found, applying...");
        component.data.restore(data);
        component.data.save();
        await markFirstRunCompleted();
        console.log(
          "[Startup] Drive data applied successfully, reloading page...",
        );
        // Hide splash and wait a bit before reload to ensure everything is saved
        //await hideSplash(splashContainer);
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Reload page to apply all visual changes
        window.location.reload();
        return;
      } else {
        // Show welcome modal with presets
        console.log("[Startup] Showing welcome modal");

        // Transform splash into modal smoothly
        const welcomeModal = new WelcomeModal({
          splashContainer: splashContainer,
          onComplete: async () => {
            await markFirstRunCompleted();
            console.log("[Startup] Setup completed");
          },
          onCancel: async () => {
            // User closed modal without selecting - use default
            await markFirstRunCompleted();
            console.log("[Startup] Setup skipped, using default");
          },
        });
        welcomeModal.show();
      }
    } else {
      // Not first run, just initialize Drive silently
      console.log("[Startup] Regular startup");

      googleDriveService
        .initialize()
        .then((authenticated) => {
          if (authenticated) {
            console.log("Google Drive: Connected");
          } else {
            console.log("Google Drive: Not connected (user needs to login)");
          }
        })
        .catch((error) => {
          console.log("Google Drive initialization error:", error);
        });
    }
  } catch (error) {
    console.error("[Startup] Error during initialization:", error);
  }
};

// Start the application
initializeApp();

// component.menu.open();
