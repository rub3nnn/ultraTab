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
const showSplash = () => {
  const splash = new Splash();
  const splashContainer = node("div|class:splash-fullscreen", [
    splash.splash(),
    complexNode({
      tag: "p",
      text: "Inicializando...",
      attr: [{ key: "class", value: "splash-loading-text" }],
    }),
  ]);

  document.body.appendChild(splashContainer);

  return splashContainer;
};

// Remove splash screen
const hideSplash = (splashContainer) => {
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
  // Show splash screen
  const splashContainer = showSplash();

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

      // Try to authenticate and download from Google Drive
      const { authenticated, data } =
        await googleDriveService.initializeAndDownload();

      // Hide splash
      await hideSplash(splashContainer);

      if (authenticated && data) {
        // User is authenticated and has data in Drive
        console.log("[Startup] Drive data found, applying...");
        component.data.restore(data);
        await markFirstRunCompleted();
      } else {
        // Show welcome modal
        console.log("[Startup] Showing welcome modal");
        const welcomeModal = new WelcomeModal({
          onComplete: async () => {
            await markFirstRunCompleted();
            console.log("[Startup] Setup completed");
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

      // Hide splash after components are loaded
      await hideSplash(splashContainer);
    }
  } catch (error) {
    console.error("[Startup] Error during initialization:", error);
    // Hide splash even on error
    await hideSplash(splashContainer);
  }
};

// Start the application
initializeApp();

// component.menu.open();
