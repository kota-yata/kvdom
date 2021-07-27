type NodeType = VNode | string | number;
type Attributes = { [key: string]: string | Function };

export interface View<State, Actions> {
  (state: State, actions: Actions): VNode;
};

// Virtual Node
export interface VNode {
  nodeName: keyof ElementTagNameMap;
  attributes: Attributes;
  children: NodeType[];
};

// Generating virtual DOM
export const h = ( nodeName: keyof ElementTagNameMap, attributes: Attributes, ...children: NodeType[] ): VNode => {
  return { nodeName, attributes, children };
};

// Recursively generating real DOM
export const createElement = (node: NodeType): HTMLElement | Text => {
  if (!isVNode(node)) return document.createTextNode(node.toString());
  const el: HTMLElement = document.createElement(node.nodeName);
  setAttributes(el, node.attributes);
  node.children.forEach(child => el.appendChild(createElement(child)));
};

// Checking if specified node is VNode
const isVNode = (node: NodeType): node is VNode => typeof node !== 'string' && typeof node !== 'number';
// Checking if specified arrtibute is event attribute (judging it as event attribute if attribute's name starts from 'on')
const isEventAttr = (attr: string): boolean => /^on/.test(attr);

// Setting specified attribute to specified target
const setAttributes = (target: HTMLElement, attrs: Attributes): void => {
  for (const attr in attrs) {
    if (!isEventAttr(attr)) {
      target.setAttribute(attr, attrs[attr] as string);
      return;
    };
    const eventName = attr.slice(2);
    target.addEventListener(eventName, attrs[attr] as EventListener);
  };
};

enum ChangedType { None, Type, Text, Node, Value, Attr };

// Diffing
const hasChanged = (a: NodeType, b: NodeType): ChangedType => {
  if (typeof a !== typeof b) return ChangedType.Type; // Different Type
  if (!isVNode(a) && a !== b) return ChangedType.Text; // Different String
  if (!isVNode(a) || !isVNode(b)) return ChangedType.None; // Nothing is Different
  if (a.nodeName !== b.nodeName) return ChangedType.Node; // Different Node
  if (a.attributes.value !== b.attributes.value) return ChangedType.Value; // Different Value
  if (JSON.stringify(a.attributes) !== JSON.stringify(b.attributes)) return ChangedType.Attr; // Different Attribute
};

// Recursively reflecting the difference of virtual DOM into real DOM
export const updateElement = ( parent: HTMLElement, oldNode: NodeType, newNode: NodeType, index = 0 ): void => {
  if (!oldNode) {
    parent.appendChild(createElement(newNode));
    return;
  };
  const target: ChildNode = parent.childNodes[index];
  if (!newNode) {
    parent.removeChild(target);
    return;
  }
  const changeType = hasChanged(oldNode, newNode); // Diffing if both node exist
  switch (changeType) {
    case ChangedType.Type:
    case ChangedType.Text:
    case ChangedType.Node:
      parent.replaceChild(createElement(newNode), target);
      return;
    case ChangedType.Value:
      // Not replacing node but just updating attribute in order to keep focus on the input element
      updateValue(target as HTMLInputElement, (newNode as VNode).attributes.value as string);
      return;
    case ChangedType.Attr:
      updateAttributes(target as HTMLElement, (oldNode as VNode).attributes, (newNode as VNode).attributes);
      return;
  };
  if (!isVNode(oldNode) || !isVNode(newNode)) return;
  for (let i = 0; i < newNode.children.length || i < oldNode.children.length; i++) {
    updateElement(target as HTMLElement, oldNode.children[i], newNode.children[i], i);
  }
};

const updateValue = (target: HTMLInputElement, newValue: string): void => { 
  target.value = newValue;
};
const updateAttributes = (target: HTMLElement, oldAttrs: Attributes, newAttrs: Attributes) => {
  for (const attr in oldAttrs) {
    if (!isEventAttr(attr)) target.removeAttribute(attr);
  };
  for (const attr in newAttrs) {
    if (!isEventAttr(attr)) target.setAttribute(attr, newAttrs[attr] as string);
  }
};
