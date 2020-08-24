<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [kibana-plugin-core-public](./kibana-plugin-core-public.md) &gt; [ChromeStart](./kibana-plugin-core-public.chromestart.md)

## ChromeStart interface

ChromeStart allows plugins to customize the global chrome header UI and enrich the UX with additional information about the current location of the browser.

<b>Signature:</b>

```typescript
export interface ChromeStart 
```

## Remarks

While ChromeStart exposes many APIs, they should be used sparingly and the developer should understand how they affect other plugins and applications.

## Example 1

How to add a recently accessed item to the sidebar:

```ts
core.chrome.recentlyAccessed.add('/app/map/1234', 'Map 1234', '1234');

```

## Example 2

How to set the help dropdown extension:

```tsx
core.chrome.setHelpExtension(elem => {
  ReactDOM.render(<MyHelpComponent />, elem);
  return () => ReactDOM.unmountComponentAtNode(elem);
});

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [docTitle](./kibana-plugin-core-public.chromestart.doctitle.md) | <code>ChromeDocTitle</code> | APIs for accessing and updating the document title. |
|  [navControls](./kibana-plugin-core-public.chromestart.navcontrols.md) | <code>ChromeNavControls</code> | [APIs](./kibana-plugin-core-public.chromenavcontrols.md) for registering new controls to be displayed in the navigation bar. |
|  [navLinks](./kibana-plugin-core-public.chromestart.navlinks.md) | <code>ChromeNavLinks</code> | [APIs](./kibana-plugin-core-public.chromenavlinks.md) for manipulating nav links. |
|  [recentlyAccessed](./kibana-plugin-core-public.chromestart.recentlyaccessed.md) | <code>ChromeRecentlyAccessed</code> | [APIs](./kibana-plugin-core-public.chromerecentlyaccessed.md) for recently accessed history. |

## Methods

|  Method | Description |
|  --- | --- |
|  [addApplicationClass(className)](./kibana-plugin-core-public.chromestart.addapplicationclass.md) | Add a className that should be set on the application container. |
|  [getApplicationClasses$()](./kibana-plugin-core-public.chromestart.getapplicationclasses_.md) | Get the current set of classNames that will be set on the application container. |
|  [getBadge$()](./kibana-plugin-core-public.chromestart.getbadge_.md) | Get an observable of the current badge |
|  [getBrand$()](./kibana-plugin-core-public.chromestart.getbrand_.md) | Get an observable of the current brand information. |
|  [getBreadcrumbs$()](./kibana-plugin-core-public.chromestart.getbreadcrumbs_.md) | Get an observable of the current list of breadcrumbs |
|  [getCustomNavLink$()](./kibana-plugin-core-public.chromestart.getcustomnavlink_.md) | Get an observable of the current custom nav link |
|  [getHelpExtension$()](./kibana-plugin-core-public.chromestart.gethelpextension_.md) | Get an observable of the current custom help conttent |
|  [getIsNavDrawerLocked$()](./kibana-plugin-core-public.chromestart.getisnavdrawerlocked_.md) | Get an observable of the current locked state of the nav drawer. |
|  [getIsVisible$()](./kibana-plugin-core-public.chromestart.getisvisible_.md) | Get an observable of the current visibility state of the chrome. |
|  [getNavType$()](./kibana-plugin-core-public.chromestart.getnavtype_.md) | Get the navigation type TODO \#64541 Can delete |
|  [removeApplicationClass(className)](./kibana-plugin-core-public.chromestart.removeapplicationclass.md) | Remove a className added with <code>addApplicationClass()</code>. If className is unknown it is ignored. |
|  [setAppTitle(appTitle)](./kibana-plugin-core-public.chromestart.setapptitle.md) | Sets the current app's title |
|  [setBadge(badge)](./kibana-plugin-core-public.chromestart.setbadge.md) | Override the current badge |
|  [setBrand(brand)](./kibana-plugin-core-public.chromestart.setbrand.md) | Set the brand configuration. |
|  [setBreadcrumbs(newBreadcrumbs)](./kibana-plugin-core-public.chromestart.setbreadcrumbs.md) | Override the current set of breadcrumbs |
|  [setCustomNavLink(newCustomNavLink)](./kibana-plugin-core-public.chromestart.setcustomnavlink.md) | Override the current set of custom nav link |
|  [setHelpExtension(helpExtension)](./kibana-plugin-core-public.chromestart.sethelpextension.md) | Override the current set of custom help content |
|  [setHelpSupportUrl(url)](./kibana-plugin-core-public.chromestart.sethelpsupporturl.md) | Override the default support URL shown in the help menu |
|  [setIsVisible(isVisible)](./kibana-plugin-core-public.chromestart.setisvisible.md) | Set the temporary visibility for the chrome. This does nothing if the chrome is hidden by default and should be used to hide the chrome for things like full-screen modes with an exit button. |
