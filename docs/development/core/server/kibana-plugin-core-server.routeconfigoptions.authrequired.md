<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [kibana-plugin-core-server](./kibana-plugin-core-server.md) &gt; [RouteConfigOptions](./kibana-plugin-core-server.routeconfigoptions.md) &gt; [authRequired](./kibana-plugin-core-server.routeconfigoptions.authrequired.md)

## RouteConfigOptions.authRequired property

Defines authentication mode for a route: - true. A user has to have valid credentials to access a resource - false. A user can access a resource without any credentials. - 'optional'. A user can access a resource if has valid credentials or no credentials at all. Can be useful when we grant access to a resource but want to identify a user if possible.

Defaults to `true` if an auth mechanism is registered.

<b>Signature:</b>

```typescript
authRequired?: boolean | 'optional';
```