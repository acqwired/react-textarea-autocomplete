// @flow

import React from 'react';

import Listeners, { KEY_CODES } from './listener';
import Item from './Item';
import type { ListProps, ListState } from './types';

export default class List extends React.Component<ListProps, ListState> {
  state: ListState = {
    selectedItem: null
  };

  constructor(props) {
    super(props);
    this.groupRefs = {};
  }

  cachedIdOfItems: Map<Object | string, string> = new Map();

  componentDidMount() {
    this.listeners.push(
      Listeners.add([KEY_CODES.DOWN, KEY_CODES.UP], this.scroll),
      Listeners.add([KEY_CODES.ENTER, KEY_CODES.TAB], this.onPressEnter)
    );

    const { values } = this.props;
    if (values && values[0]) {
      this.selectItem(values[0]);
    }
  }

  componentDidUpdate({ values: oldValues }: ListProps) {
    const { values } = this.props;

    const oldValuesSerialized = oldValues.map((val) => this.getId(val)).join('');
    const newValuesSerialized = values.map((val) => this.getId(val)).join('');

    if (oldValuesSerialized !== newValuesSerialized && values && values[0]) {
      this.selectItem(values[0]);
    }
  }

  componentWillUnmount() {
    let listener;
    while (this.listeners.length) {
      listener = this.listeners.pop();
      Listeners.remove(listener);
    }
  }

  onPressEnter = (e: SyntheticEvent<*>) => {
    if (typeof e !== 'undefined') {
      e.preventDefault();
    }

    const { values } = this.props;

    this.modifyText(values[this.getPositionInList()]);
  };

  getPositionInList = () => {
    const { values } = this.props;
    const { selectedItem } = this.state;

    if (!selectedItem) {
      return 0;
    }

    return values.findIndex((a) => this.getId(a) === this.getId(selectedItem));
  };

  getId = (item: Object | string): string => {
    if (this.cachedIdOfItems.has(item)) {
      // $FlowFixMe
      return this.cachedIdOfItems.get(item);
    }

    const textToReplace = this.props.getTextToReplace(item);

    const computeId = (): string => {
      if (textToReplace) {
        if (textToReplace.key) {
          return textToReplace.key;
        }

        if (typeof item === 'string' || !item.key) {
          return textToReplace.text;
        }
      }

      if (!item.key) {
        throw new Error(`Item ${JSON.stringify(item)} has to have defined "key" property`);
      }

      // $FlowFixMe
      return `${item.group}__${item.key}`;
    };

    const id = computeId();

    this.cachedIdOfItems.set(item, id);

    return id;
  };

  props: ListProps;

  listeners: Array<number> = [];

  itemsRef: {
    [key: string]: HTMLDivElement
  } = {};

  modifyText = (value: Object | string) => {
    if (!value) {
      return;
    }

    const { onSelect } = this.props;

    onSelect(value);
  };

  selectItem = (item: Object | string, keyboard: boolean = false) => {
    const { onItemHighlighted } = this.props;

    if (this.state.selectedItem === item) {
      return;
    }

    this.setState({ selectedItem: item }, () => {
      onItemHighlighted(item);

      if (keyboard) {
        this.props.dropdownScroll(this.itemsRef[this.getId(item)]);
      }
    });
  };

  scroll = (e: KeyboardEvent) => {
    e.preventDefault();

    const { values } = this.props;

    const code = e.keyCode || e.which;

    const oldPosition = this.getPositionInList();
    let newPosition;
    switch (code) {
      case KEY_CODES.DOWN:
        newPosition = oldPosition + 1;
        break;
      case KEY_CODES.UP:
        newPosition = oldPosition - 1;
        break;
      default:
        newPosition = oldPosition;
        break;
    }

    newPosition = ((newPosition % values.length) + values.length) % values.length; // eslint-disable-line
    this.selectItem(values[newPosition], [KEY_CODES.DOWN, KEY_CODES.UP].includes(code));
  };

  isSelected = (item: Object | string): boolean => {
    const { selectedItem } = this.state;
    if (!selectedItem) {
      return false;
    }

    return this.getId(selectedItem) === this.getId(item);
  };

  render() {
    const { values, component, style, itemClassName, className, itemStyle, groups } = this.props;
    return (
      <div className={`rta__listcontainer`}>
        <div className={`rta__listcontainertitle`}>Available Variables</div>
        <div className="rta__groups">
          {
            (values.length === 1 && values[0].group === 'nomatch')
              ? <div className="rta__nomatch">
                <div className="nomatch-text">
                  No variables found
                </div>
              </div>
              : groups.map((group, index) => (
                group.key !== 'nomatch' &&
                <button
                  key={group.key}
                  onClick={() => {
                    if (this.groupRefs[index.toString()]) {
                      this.groupRefs[index.toString()].scrollIntoView();
                    }
                  }}
                  className="rta__group_button"
                >
                  {group.label}
                </button>
              ))}
        </div>
        <div>
          {groups.map((group, groupIndex) => {
            if (values.length === 1 && values[0].group === 'nomatch') {
              return null;
            }
            const filteredValues = values.filter((value) => value.group === group.key);
            if (!filteredValues.length) {
              return null;
            }
            return (
              <div>
                <div
                  className="rta__listgroup"
                  ref={(ref) => {
                    this.groupRefs[groupIndex.toString()] = ref;
                  }}
                >
                  {group.label}
                </div>
                <ul className={`rta__list ${className || ''}`} style={style}>
                  {values
                    .filter((value) => value.group === group.key)
                    .map((item) => (
                      <Item
                        key={this.getId(item)}
                        innerRef={(ref) => {
                          this.itemsRef[this.getId(item)] = ref;
                        }}
                        selected={this.isSelected(item)}
                        item={item}
                        className={itemClassName}
                        style={itemStyle}
                        onClickHandler={this.onPressEnter}
                        onSelectHandler={this.selectItem}
                        component={component}
                      />
                    ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
