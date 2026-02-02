import { message } from "../message";
import { node } from "../../utility/node";
import { complexNode } from "../../utility/complexNode";
import { Modal } from "../modal";
import { Button } from "../button";
import googleDriveService from "../../service/GoogleDriveService.js";
import { data } from "../data";
import { version } from "../version";
import { APP_NAME } from "../../constant";

import "./index.css";

export const WelcomeModal = function ({
  splashContainer = null,
  onComplete = () => {},
  onCancel = () => {},
} = {}) {
  this.presets = [
    {
      id: 0,
      name: "Default",
      description: "Configuración predeterminada de " + APP_NAME,
      thumbnail:
        "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-0.png",
      isDefault: true,
    },
    {
      id: 1,
      name: "Minimal Dark",
      description: "Tema oscuro minimalista",
      thumbnail:
        "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-1.png",
      url: "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-1.json",
    },
    {
      id: 2,
      name: "Ocean Blue",
      description: "Tema azul océano",
      thumbnail:
        "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-2.png",
      url: "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-2.json",
    },
    {
      id: 3,
      name: "Sunset",
      description: "Tema cálido atardecer",
      thumbnail:
        "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-3.png",
      url: "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-3.json",
    },
    {
      id: 4,
      name: "Forest Green",
      description: "Tema verde bosque",
      thumbnail:
        "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-4.png",
      url: "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-4.json",
    },
    {
      id: 5,
      name: "Purple Dreams",
      description: "Tema púrpura",
      thumbnail:
        "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-5.png",
      url: "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-5.json",
    },
    {
      id: 6,
      name: "Neon Lights",
      description: "Tema neón vibrante",
      thumbnail:
        "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-6.png",
      url: "https://raw.githubusercontent.com/rub3nnn/ultraTab/main/asset/presets/preset-6.json",
    },
  ];

  this.state = {
    selectedPreset: 0, // Default preset
    step: "welcome", // 'welcome', 'drive', 'presets'
  };

  this.element = {
    container: node("div|class:welcome-modal"),
    welcome: null,
    driveOption: null,
    presetsOption: null,
  };

  this.render = {
    presets: () => {
      const presetsContent = node("div|class:presets-content", [
        complexNode({
          tag: "h2",
          text: "Elige tu Estilo",
          attr: [{ key: "class", value: "presets-heading" }],
        }),
        complexNode({
          tag: "p",
          text: "Haz clic en cualquier diseño para aplicarlo al instante",
          attr: [{ key: "class", value: "presets-description" }],
        }),
        complexNode({
          tag: "div",
          attr: [{ key: "class", value: "presets-grid" }],
        }),
      ]);

      const presetsGrid = presetsContent.querySelector(".presets-grid");

      this.presets.forEach((preset) => {
        const presetCard = node(
          "div|class:preset-card" +
            (preset.id === this.state.selectedPreset
              ? ",preset-card-selected"
              : ""),
          [
            preset.thumbnail
              ? complexNode({
                  tag: "img",
                  attr: [
                    { key: "class", value: "preset-thumbnail" },
                    { key: "src", value: preset.thumbnail },
                    { key: "alt", value: preset.name },
                    { key: "loading", value: "lazy" },
                  ],
                })
              : complexNode({
                  tag: "div",
                  attr: [
                    {
                      key: "class",
                      value: "preset-thumbnail preset-thumbnail-default",
                    },
                  ],
                  children: [
                    complexNode({
                      tag: "i",
                      attr: [{ key: "class", value: "fas fa-star fa-3x" }],
                    }),
                  ],
                }),
            complexNode({
              tag: "div",
              attr: [{ key: "class", value: "preset-info" }],
              children: [
                complexNode({
                  tag: "h4",
                  text: preset.name,
                  attr: [{ key: "class", value: "preset-name" }],
                }),
              ],
            }),
          ],
        );

        presetCard.addEventListener("click", () => {
          // Marcar como seleccionado visualmente
          presetsGrid.querySelectorAll(".preset-card").forEach((card) => {
            card.classList.remove("preset-card-selected");
          });
          presetCard.classList.add("preset-card-selected");
          this.state.selectedPreset = preset.id;

          // Aplicar el preset directamente
          this.applyPreset();
        });

        presetsGrid.appendChild(presetCard);
      });

      return presetsContent;
    },
  };

  this.showPresets = () => {
    this.state.step = "presets";
    this.element.container.innerHTML = "";
    this.element.container.appendChild(this.render.presets());
  };

  this.applyPreset = async () => {
    const selectedPreset = this.presets.find(
      (p) => p.id === this.state.selectedPreset,
    );

    if (selectedPreset.isDefault) {
      // Default preset, just close
      onComplete();
      return;
    }

    try {
      // Show loading
      const loadingMessage = node("div|class:welcome-loading", [
        complexNode({
          tag: "i",
          attr: [{ key: "class", value: "fas fa-spinner fa-spin fa-2x" }],
        }),
        complexNode({
          tag: "p",
          text: "Aplicando preset...",
        }),
      ]);

      this.element.container.innerHTML = "";
      this.element.container.appendChild(loadingMessage);

      // Download preset from GitHub
      const response = await fetch(selectedPreset.url);
      if (!response.ok) {
        throw new Error("Failed to download preset");
      }

      let presetData = await response.json();

      // Update preset data if it's from an older version
      if (presetData.version !== version.number) {
        console.log(
          "[WelcomeModal] Updating preset from version",
          presetData.version,
          "to",
          version.number,
        );
        presetData = data.update(presetData);
      }

      // Ensure all import flags are set to true
      data.import.state.setup.include = true;
      data.import.state.theme.include = true;
      data.import.state.bookmark.include = true;
      data.import.state.bookmark.type = "restore";

      // Restore data
      data.restore(presetData);

      // Save to localStorage to persist the changes
      data.save();

      console.log("[WelcomeModal] Preset applied and saved successfully");

      // Mark as completed BEFORE reload to prevent modal from showing again
      await onComplete();

      // Reload the page to apply all changes visually
      console.log("[WelcomeModal] Reloading page to apply changes...");
      window.location.reload();
    } catch (error) {
      console.error("Error applying preset:", error);

      const errorMessage = node("div|class:welcome-error", [
        complexNode({
          tag: "i",
          attr: [{ key: "class", value: "fas fa-exclamation-triangle fa-3x" }],
        }),
        complexNode({
          tag: "h3",
          text: "Error al cargar preset",
        }),
        complexNode({
          tag: "p",
          text: "No se pudo cargar el preset. Por favor, intenta con otro.",
        }),
      ]);

      const retryButton = new Button({
        text: "Reintentar",
        style: ["line"],
        func: () => {
          this.applyPreset();
        },
      });

      errorMessage.appendChild(retryButton.button);

      this.element.container.innerHTML = "";
      this.element.container.appendChild(errorMessage);
    }
  };

  this.show = () => {
    // Si hay splash, hacer fade out primero
    if (splashContainer) {
      splashContainer.style.opacity = "0";
      splashContainer.style.transition = "opacity 0.4s ease-out";

      setTimeout(() => {
        if (document.body.contains(splashContainer)) {
          document.body.removeChild(splashContainer);
        }
      }, 400);
    }

    const modal = new Modal({
      heading: "¡Bienvenido a " + APP_NAME + "!",
      content: this.element.container,
      width: "large",
      hideActions: true,
      closeOnBackdrop: true,
      openAction: () => {
        // Modal opened, ensure smooth appearance
        setTimeout(() => {
          this.element.container.classList.add("welcome-modal-ready");
        }, 50);
      },
      closeAction: () => {
        // User closed modal - use default preset
        console.log("[WelcomeModal] Modal closed, using default preset");
        onCancel();
      },
    });

    this.showPresets();
    modal.open();

    return modal;
  };

  this.element.container.appendChild(this.render.presets());
};
