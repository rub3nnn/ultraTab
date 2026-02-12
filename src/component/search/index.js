import { data } from "../data";
import { state } from "../state";
import { bookmark } from "../bookmark";
import { groupAndBookmark } from "../groupAndBookmark";

import { Button } from "../button";
import { Control_text } from "../control/text";

import { node } from "../../utility/node";
import { trimString } from "../../utility/trimString";
import { isValidString } from "../../utility/isValidString";

import "./index.css";

export const Search = function () {
  this.element = {
    search: node("div|class:search"),
    form: node("form|class:search-form,action,method:get"),
    submit: node("input|type:submit,value:Search,class:is-hidden"),
    input: new Control_text({
      object: state.get.current(),
      path: "header.search.string",
      id: "header-search-string",
      value: "",
      placeholder: "Search Bookmarks or Search",
      labelText: "Search",
      classList: ["search-input"],
      srOnly: true,
      action: () => {
        this.state();
        this.performSearch();
      },
    }),
    clear: new Button({
      text: "Clear search",
      srOnly: true,
      iconName: "cross",
      style: ["link", "line"],
      title: "Clear search",
      classList: ["search-clear"],
      func: () => {
        this.element.input.text.value = "";
        this.state();
        this.performSearch();
      },
    }),
  };

  this.state = () => {
    if (isValidString(trimString(this.element.input.text.value))) {
      state.get.current().search = true;
    } else {
      state.get.current().search = false;
    }

    data.save();
  };

  this.placeholder = () => {
    let placeholder = "";

    if (state.get.current().bookmark.show) {
      placeholder = "Find bookmarks or search";
    } else {
      placeholder = "Search";
    }

    this.element.input.text.placeholder = placeholder;
  };

  this.engine = {};

  this.engine.set = () => {
    // Form submission will use chrome.search API instead of form action
    this.element.form.addEventListener("submit", (event) => {
      event.preventDefault();

      const searchQuery = trimString(this.element.input.text.value);

      // Only perform web search if there's a query and no matching bookmarks
      if (isValidString(searchQuery) && this.resultCount().total === 0) {
        // Use chrome.search API
        if (chrome && chrome.search && chrome.search.query) {
          chrome.search.query({
            text: searchQuery,
            disposition: state.get.current().header.search.newTab
              ? "NEW_TAB"
              : "CURRENT_TAB",
          });
        }
      }
    });
  };

  this.engine.bind = () => {
    this.element.input.addEventListener();
  };

  this.performSearch = () => {
    const html = document.querySelector("html");

    if (state.get.current().search) {
      html.classList.add("is-search");

      const searchString = trimString(
        this.element.input.text.value,
      ).toLowerCase();

      bookmark.all.forEach((item) => {
        item.items.forEach((item) => {
          item.searchMatch = false;

          let matchUrl =
            isValidString(item.url) &&
            item.url.toLowerCase().includes(searchString);

          let matchName =
            isValidString(item.display.name.text) &&
            trimString(item.display.name.text)
              .toLowerCase()
              .includes(searchString);

          if (matchUrl || matchName) {
            item.searchMatch = true;
          }
        });
      });
    } else {
      html.classList.remove("is-search");

      this.clearSearch();
    }

    groupAndBookmark.render();
  };

  this.clearSearch = () => {
    bookmark.all.forEach((item) => {
      item.items.forEach((item) => {
        delete item.searchMatch;
      });
    });

    data.save();
  };

  this.assemble = () => {
    this.element.input.text.type = "Search";

    this.element.form.appendChild(this.element.input.text);

    this.element.form.appendChild(this.element.submit);

    this.element.form.appendChild(this.element.clear.button);

    this.element.search.appendChild(this.element.form);
  };

  this.search = () => {
    return this.element.search;
  };

  this.resultCount = () => {
    const count = { total: 0, group: [] };

    bookmark.all.forEach((item, i) => {
      count.group.push({
        bookmarkCount: item.items.length,
        searchMatch: 0,
      });

      const groupIndex = i;

      item.items.forEach((item) => {
        if (item.searchMatch) {
          count.group[groupIndex].searchMatch++;
        }
      });

      count.total = count.total + count.group[groupIndex].searchMatch;
    });

    return count;
  };

  this.update = {};

  this.update.style = () => {
    const html = document.querySelector("html");

    if (state.get.current().theme.header.search.opacity < 40) {
      html.classList.add("is-header-search-opacity-low");
    } else {
      html.classList.remove("is-header-search-opacity-low");
    }
  };

  this.assemble();

  this.placeholder();

  this.engine.set();

  this.clearSearch();

  this.update.style();
};
