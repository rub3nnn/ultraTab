import { message } from "../../message";

import * as form from "../../form";

import { node } from "../../../utility/node";

import { APP_NAME, NT_NAME } from "../../../constant";

import { Link } from "../../link";
import { Splash } from "../../splash";

const appSetting = {};

appSetting.app = (parent) => {
  /*appSetting.app.para1 = node(`p:${message.get('menuContentAppPara1') || 'Text'}`);

  appSetting.app.link1 = new Link({
    text: message.get('menuContentAppLink1'),
    href: `https://www.reddit.com/r/${APP_NAME}`,
    openNew: true
  }); */

  appSetting.app.para2 = node(
    `p:${message.get("menuContentAppPara2") || "Text"}`,
  );

  appSetting.app.link2 = new Link({
    text: message.get("menuContentAppLink2"),
    href: `https://github.com/rub3nnn/${APP_NAME}`,
    openNew: true,
  });

  appSetting.app.link3 = new Link({
    text: message.get("menuContentAppLink3"),
    href: `https://github.com/rub3nnn/${APP_NAME}/blob/main/license`,
    openNew: true,
  });

  appSetting.app.para1 = node(
    `p:${message.get("menuContentAppForkInfo") || "Text"}`,
  );

  appSetting.app.appFork = new Link({
    text: message.get("menuContentAppForkLink"),
    href: `https://github.com/zombiefox/${NT_NAME}`,
    openNew: true,
  });

  const splash = new Splash();

  parent.appendChild(
    node("div", [
      splash.splash(),
      node("hr"),

      form.wrap({
        children: [
          appSetting.app.para2,
          form.indent({
            children: [
              node("p", [appSetting.app.link2.link()]),
              node("p", [appSetting.app.link3.link()]),
            ],
          }),
        ],
      }),
      form.wrap({
        children: [
          appSetting.app.para1,
          form.indent({
            children: [node("p", [appSetting.app.appFork.link()])],
          }),
        ],
      }),
    ]),
  );
};

export { appSetting };
