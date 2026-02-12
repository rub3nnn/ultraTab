import { state } from "../state";
import { header } from "../header";
import { message } from "../message";

import { node } from "../../utility/node";
import { trimString } from "../../utility/trimString";
import { complexNode } from "../../utility/complexNode";

import "./index.css";

export const SearchEmpty = function () {
  this.element = {
    empty: node("div|class:search-empty"),
    description: node("p|class:search-empty-string"),
    helper: node("p|class:search-empty-helper small muted"),
  };

  this.assemble = () => {
    const searchValue = trimString(header.element.search.element.input.text.value);
    this.element.description.textContent = `${message.get('searchEmptyNoBookmarks')} "${searchValue}" ${message.get('searchEmptyFound')}`;
    this.element.helper.textContent = message.get('searchEmptyPressEnter');

    this.element.empty.appendChild(this.element.description);

    this.element.empty.appendChild(this.element.helper);
  };

  this.empty = () => {
    return this.element.empty;
  };

  this.assemble();
};
