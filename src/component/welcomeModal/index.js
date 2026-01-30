import { message } from "../message";
import { node } from "../../utility/node";
import { complexNode } from "../../utility/complexNode";
import { Modal } from "../modal";
import { Button } from "../button";
import googleDriveService from "../../service/GoogleDriveService.js";
import { data } from "../data";
import { APP_NAME } from "../../constant";

import "./index.css";

export const WelcomeModal = function ({ onComplete = () => {} } = {}) {
  this.presets = [
    {
      id: 0,
      name: "Default",
      description: "Configuración predeterminada de " + APP_NAME,
      thumbnail: null,
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
    welcome: () => {
      const welcomeContent = node("div|class:welcome-content", [
        complexNode({
          tag: "h2",
          text: "¡Bienvenido a " + APP_NAME + "!",
          attr: [{ key: "class", value: "welcome-heading" }],
        }),
        complexNode({
          tag: "p",
          text: "Personaliza tu experiencia de nueva pestaña con temas, marcadores y sincronización en la nube.",
          attr: [{ key: "class", value: "welcome-description" }],
        }),
        complexNode({
          tag: "div",
          attr: [{ key: "class", value: "welcome-options" }],
        }),
      ]);

      const optionsContainer = welcomeContent.querySelector(".welcome-options");

      // Opción 1: Sincronizar con Google Drive
      const driveButton = new Button({
        text: "Sincronizar con Google Drive",
        iconName: "cloud",
        style: ["line"],
        classList: ["button-block", "welcome-option-button"],
        func: () => {
          this.handleDriveSync();
        },
      });

      const driveOption = node("div|class:welcome-option", [
        complexNode({
          tag: "div",
          attr: [{ key: "class", value: "welcome-option-icon" }],
          children: [
            complexNode({
              tag: "i",
              attr: [{ key: "class", value: "fas fa-cloud fa-3x" }],
            }),
          ],
        }),
        complexNode({
          tag: "h3",
          text: "Importar desde Drive",
          attr: [{ key: "class", value: "welcome-option-title" }],
        }),
        complexNode({
          tag: "p",
          text: "Conecta tu cuenta de Google y sincroniza tu configuración en todos tus dispositivos.",
          attr: [{ key: "class", value: "welcome-option-description" }],
        }),
        driveButton,
      ]);

      // Opción 2: Elegir preset
      const presetButton = new Button({
        text: "Elegir un Preset",
        iconName: "palette",
        style: ["line"],
        classList: ["button-block", "welcome-option-button"],
        func: () => {
          this.showPresets();
        },
      });

      const presetOption = node("div|class:welcome-option", [
        complexNode({
          tag: "div",
          attr: [{ key: "class", value: "welcome-option-icon" }],
          children: [
            complexNode({
              tag: "i",
              attr: [{ key: "class", value: "fas fa-palette fa-3x" }],
            }),
          ],
        }),
        complexNode({
          tag: "h3",
          text: "Comenzar con un Preset",
          attr: [{ key: "class", value: "welcome-option-title" }],
        }),
        complexNode({
          tag: "p",
          text: "Elige uno de nuestros presets diseñados para comenzar rápidamente.",
          attr: [{ key: "class", value: "welcome-option-description" }],
        }),
        presetButton,
      ]);

      optionsContainer.appendChild(driveOption);
      optionsContainer.appendChild(presetOption);

      return welcomeContent;
    },

    presets: () => {
      const presetsContent = node("div|class:presets-content", [
        complexNode({
          tag: "h2",
          text: "Elige un Preset",
          attr: [{ key: "class", value: "presets-heading" }],
        }),
        complexNode({
          tag: "p",
          text: "Selecciona uno de los siguientes presets para personalizar tu experiencia:",
          attr: [{ key: "class", value: "presets-description" }],
        }),
        complexNode({
          tag: "div",
          attr: [{ key: "class", value: "presets-grid" }],
        }),
        complexNode({
          tag: "div",
          attr: [{ key: "class", value: "presets-actions" }],
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
              tag: "h4",
              text: preset.name,
              attr: [{ key: "class", value: "preset-name" }],
            }),
            complexNode({
              tag: "p",
              text: preset.description,
              attr: [{ key: "class", value: "preset-description" }],
            }),
          ],
        );

        presetCard.addEventListener("click", () => {
          // Deseleccionar otros presets
          presetsGrid.querySelectorAll(".preset-card").forEach((card) => {
            card.classList.remove("preset-card-selected");
          });
          presetCard.classList.add("preset-card-selected");
          this.state.selectedPreset = preset.id;
        });

        presetsGrid.appendChild(presetCard);
      });

      const actionsContainer = presetsContent.querySelector(".presets-actions");

      const backButton = new Button({
        text: "Atrás",
        style: ["line"],
        func: () => {
          this.showWelcome();
        },
      });

      const applyButton = new Button({
        text: "Aplicar Preset",
        style: ["line"],
        func: () => {
          this.applyPreset();
        },
      });

      actionsContainer.appendChild(backButton);
      actionsContainer.appendChild(applyButton);

      return presetsContent;
    },
  };

  this.showWelcome = () => {
    this.state.step = "welcome";
    this.element.container.innerHTML = "";
    this.element.container.appendChild(this.render.welcome());
  };

  this.showPresets = () => {
    this.state.step = "presets";
    this.element.container.innerHTML = "";
    this.element.container.appendChild(this.render.presets());
  };

  this.handleDriveSync = async () => {
    try {
      // Show loading state
      const loadingMessage = node("div|class:welcome-loading", [
        complexNode({
          tag: "i",
          attr: [{ key: "class", value: "fas fa-spinner fa-spin fa-2x" }],
        }),
        complexNode({
          tag: "p",
          text: "Conectando con Google Drive...",
        }),
      ]);

      this.element.container.innerHTML = "";
      this.element.container.appendChild(loadingMessage);

      // Authenticate with Google Drive
      await googleDriveService.getAuthToken(true);

      // Try to download existing data
      const driveData = await googleDriveService.download();

      if (driveData) {
        // Apply the data
        data.restore(driveData);
        onComplete();
      } else {
        // No data found, show message and let user choose preset
        const noDataMessage = node("div|class:welcome-message", [
          complexNode({
            tag: "i",
            attr: [{ key: "class", value: "fas fa-info-circle fa-3x" }],
          }),
          complexNode({
            tag: "h3",
            text: "No se encontró configuración",
          }),
          complexNode({
            tag: "p",
            text: "No se encontró ninguna configuración guardada en Drive. Puedes elegir un preset o comenzar desde cero.",
          }),
        ]);

        const continueButton = new Button({
          text: "Elegir Preset",
          style: ["line"],
          func: () => {
            this.showPresets();
          },
        });

        const skipButton = new Button({
          text: "Comenzar sin Preset",
          style: ["line"],
          func: () => {
            onComplete();
          },
        });

        noDataMessage.appendChild(continueButton);
        noDataMessage.appendChild(skipButton);

        this.element.container.innerHTML = "";
        this.element.container.appendChild(noDataMessage);
      }
    } catch (error) {
      console.error("Error syncing with Drive:", error);

      const errorMessage = node("div|class:welcome-error", [
        complexNode({
          tag: "i",
          attr: [{ key: "class", value: "fas fa-exclamation-triangle fa-3x" }],
        }),
        complexNode({
          tag: "h3",
          text: "Error de conexión",
        }),
        complexNode({
          tag: "p",
          text: "No se pudo conectar con Google Drive. Por favor, intenta de nuevo o elige un preset.",
        }),
      ]);

      const retryButton = new Button({
        text: "Reintentar",
        style: ["line"],
        func: () => {
          this.handleDriveSync();
        },
      });

      const backButton = new Button({
        text: "Volver",
        style: ["line"],
        func: () => {
          this.showWelcome();
        },
      });

      errorMessage.appendChild(retryButton);
      errorMessage.appendChild(backButton);

      this.element.container.innerHTML = "";
      this.element.container.appendChild(errorMessage);
    }
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
          text: "Cargando preset...",
        }),
      ]);

      this.element.container.innerHTML = "";
      this.element.container.appendChild(loadingMessage);

      // Download preset from GitHub
      const response = await fetch(selectedPreset.url);
      if (!response.ok) {
        throw new Error("Failed to download preset");
      }

      const presetData = await response.json();

      // Restore data
      data.restore(presetData);

      // Complete
      onComplete();
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
          text: "No se pudo cargar el preset. Por favor, intenta con otro o comienza sin preset.",
        }),
      ]);

      const backButton = new Button({
        text: "Volver",
        style: ["line"],
        func: () => {
          this.showPresets();
        },
      });

      errorMessage.appendChild(backButton);

      this.element.container.innerHTML = "";
      this.element.container.appendChild(errorMessage);
    }
  };

  this.show = () => {
    const modal = new Modal({
      heading: "¡Bienvenido!",
      content: this.element.container,
      width: "large",
      hideActions: true,
      closeOnBackdrop: false,
    });

    this.showWelcome();
    modal.open();

    return modal;
  };

  this.element.container.appendChild(this.render.welcome());
};
