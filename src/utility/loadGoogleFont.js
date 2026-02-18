/**
 * Load Google Fonts dynamically without using external libraries
 * This is Manifest V3 compliant as it only loads fonts from Google Fonts API
 * @param {string} fontFamily - The font family name (e.g., "Roboto")
 * @param {string} weights - The font weights and styles (e.g., "100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i")
 */
export const loadGoogleFont = (
  fontFamily,
  weights = "100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i",
) => {
  if (!fontFamily || fontFamily.trim() === "") {
    return;
  }

  const fontName = fontFamily.trim();
  const linkId = `google-font-${fontName.replace(/\s+/g, "-").toLowerCase()}`;

  // Check if this font is already loaded
  if (document.getElementById(linkId)) {
    return;
  }

  // Create the Google Fonts URL
  // Use display=swap for better performance
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@${weights.replace(/i/g, "")}&display=swap`;

  // Create and append the link element
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = fontUrl;

  document.head.appendChild(link);
};
