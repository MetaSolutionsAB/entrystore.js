# Changelog

All notable changes to the entrystore.js project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.19.0](https://bitbucket.org/metasolutions/entrystore.js/branches/compare/4.19.0%0D4.18.1) - 2026-11-11

### Security

- Security improvements for Node clients that log in. Node users who log in should upgrade

### Added

- [ESJS-77](https://metasolutions.atlassian.net/browse/ESJS-77) Added `SolrQuery.contextType()` to filter entries by the type of their context
- [ESJS-61](https://metasolutions.atlassian.net/browse/ESJS-61) Added `SolrQuery.literalPropertySort()`, `integerPropertySort()` and `datePropertySort()` to sort on the values of a predicate, including namespace-prefixed ones

### Changed

- [ESJS-74](https://metasolutions.atlassian.net/browse/ESJS-74) Upgraded to ESLint 9 with the shared linting config, and fixed the JSDoc types and warnings
- [ESJS-75](https://metasolutions.atlassian.net/browse/ESJS-75) Removed unused build dependencies and upgraded jest to 30
- [ESJS-30](https://metasolutions.atlassian.net/browse/ESJS-30) Declared the license in the `license` field of package.json
- Upgraded dependencies

### Fixed

- [ESJS-66](https://metasolutions.atlassian.net/browse/ESJS-66) Fixed `EntryStore.getStatus()` on EntryStore 6, which serves the extended status at `/management/status/extended`; EntryStore 5 is still asked the old way. A new `include` option requests count and relation statistics
- [ESJS-63](https://metasolutions.atlassian.net/browse/ESJS-63) Fixed `File.get()` returning the string "[object Object]" instead of the resource
- [ESJS-67](https://metasolutions.atlassian.net/browse/ESJS-67) Fixed `Group.setName()` throwing a TypeError before sending the request
- [ESJS-68](https://metasolutions.atlassian.net/browse/ESJS-68) Fixed user setters throwing a ReferenceError instead of the HTTP error when the request fails
- [ESJS-69](https://metasolutions.atlassian.net/browse/ESJS-69) Fixed `EntryStore.getMetadataURI(contextId, entryId)` returning the entry URI instead of the metadata URI
- [ESJS-70](https://metasolutions.atlassian.net/browse/ESJS-70) Fixed `SolrQuery.titleWithLanguage()` searching the field `title.undefined`
- [ESJS-71](https://metasolutions.atlassian.net/browse/ESJS-71) Fixed `SolrQuery.disjunctive()` joining top-level clauses with "+OR" without the trailing "+"
- [ESJS-72](https://metasolutions.atlassian.net/browse/ESJS-72) Fixed list paging ignoring the sort set with `List.setSort()`

## [4.18.1](https://bitbucket.org/metasolutions/entrystore.js/branches/compare/4.18.1%0D4.18.0) - 2026-10-22

### Fixed

- Upgraded dependencies and removed unused dev dependencies to resolve security advisories (serialize-javascript, uuid, @tootallnate/once)

## [4.18.0](https://bitbucket.org/metasolutions/entrystore.js/branches/compare/4.18.0%0D4.17.0) - 2026-10-02

### Added

- [ESJS-65](https://metasolutions.atlassian.net/browse/ESJS-65) Added `EntryInfo.getMergedMetadataURI()` pointing to the merged metadata (local and/or cached external metadata)

## [4.17.0](https://bitbucket.org/metasolutions/entrystore.js/branches/compare/4.17.0%0D4.16.2) - 2026-09-03

### Changed

- [ESJS-62](https://metasolutions.atlassian.net/browse/ESJS-62) Log out via POST, with a fallback to GET on 405/404 responses
- Upgraded dependencies

## [4.16.2](https://bitbucket.org/metasolutions/entrystore.js/branches/compare/4.16.2%0D4.16.1) - 2026-03-09

### Changed

- [ESJS-60](https://metasolutions.atlassian.net/browse/ESJS-60) Upload files with a direct PUT request instead of POST with method overriding
- [ESJS-57](https://metasolutions.atlassian.net/browse/ESJS-57) Migrated the project to pnpm
- [ESJS-59](https://metasolutions.atlassian.net/browse/ESJS-59) Adopted the shared @entryscape/linting-config and reformatted the codebase
- Upgraded dependencies

## [4.16.1](https://bitbucket.org/metasolutions/entrystore.js/branches/compare/4.16.1%0Dv4.16.0) - 2025-10-08

### Fixed

- Upgraded packages (webpack-dev-server, superagent, jest, etc)
