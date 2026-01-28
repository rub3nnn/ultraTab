import { component } from "./component";

import { APP_NAME } from "./constant";

// Import Google Drive Service for silent authentication
import googleDriveService from "./service/GoogleDriveService.js";

console.log(
  APP_NAME + " version:",
  component.version.number,
  component.version.name,
);

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

// Initialize Google Drive sync with silent authentication
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

// component.menu.open();
